import tkinter as tk
from tkinter import ttk
from constants import *
from datetime import datetime,timedelta
import ast
import random
import time
import colorsys
import pyttsx3
from queue import Queue
from threading import Thread

from sframe import ScrollableFrame,AutoScrollbar
from contextMenu import ContextMenu,HoverButton




class Chat(tk.Frame):
     
    def __init__(self,parent,connection):
        
        tk.Frame.__init__(self, parent,bg=colours['sides'])
        self.parent=parent
        self.connection=connection

        self.startSoundThread()

        self.checkMessages()

        self.parent.login.destroy()
        self.grid(column=1,row=2,sticky='nsew')
        
        self.parent.setSize(chatWidth,chatHeight)
        self.parent.bind_all('<MouseWheel>',self.onMousewheel)

        self.bind_all('<Button-3>',self.queryItems)
    
    def startSoundThread(self):
        self.say=Queue() #defines a queue
        t = Thread(target=self.sayLoop) #creates a thread for TTS
        t.daemon = True #makes sure the thread close upon program close
        t.start() #starts the thread

    def sayLoop(self):
        engine = pyttsx3.init() #initilises tts engine
        while True: #runs forever
            message=self.say.get() #halts until new item in queue
            engine.say(message) #says message
            engine.runAndWait() #processes message
            self.say.task_done() #finishes queue job

    def queryItems(self,event=None):

        widget=event.widget
        if isinstance(widget,tk.Text):
            context=self.spawnContext(event)
            
            sender=self.getTextFromEvent(event,'sender')
            message=self.getTextFromEvent(event,'message')
            context.add(text='Report Bullying',command=self.report,sender=sender,message=message)
            print(message)
            if message:
                context.add(text='Say Message',command=self.tts,message=message)
            
            if sender:
                context.add(text='Message User',command=self.dm,user=sender)

            if widget.tag_ranges("sel"):
                wT=widget.selection_get()
                context.add(text='Copy',command=self.copyText,wT=wT)
            
                
        if isinstance(widget,item):
            if widget.parent == self.roomList:
                context=self.spawnContext(event)
                context.add(text='Enter Room',command=widget.parent.select,item=widget)
                context.add(text='Create Room',command=self.createRoom)
            elif widget.parent == self.userList:
                context=self.spawnContext(event)
                context.add(text='Message User',command=self.dm,user=widget.text)

        if widget==self.roomList.canvas:
            context=self.spawnContext(event)
            context.add(text='Create Room',command=self.createRoom)
    
    def createRoom(self):
        item=self.roomList.addItem(colour='#'+(''.join([random.choice('0123456789ABCDEF') for x in range(6)])))
        item.inpName()

    def tts(self,message):
        self.say.put(message)

    def report(self,sender,message):
        print(sender,message)
        
    def dm(self,user):
        if user not in self.roomList.names:
            
            self.chatrooms[user]=Center(self,bg=colours['center'],type='dm')
            p={'type':'fetch','param':'dm','requester':self.parent.connection.username,'asoc':user}
            self.parent.connection.sendPackage([p])

            colour=self.userList.itemColours[user]
            self.roomList.addItem(user,type='dm',colour=colour)
            self.roomList.contents[-1].isInitalized=True
            self.roomList.select(item=self.roomList.contents[-1])
            self.roomList.checkScroll()
            self.roomList.canvas.yview_moveto(1)
            
            
            self.chatrooms[user].grid(column=2,row=1,sticky='nsew')
            
            
        else:
            for i in self.roomList.contents:
                if i.text==user:
                    self.roomList.select(item=i)
                    fraction=i.winfo_y()/self.roomList.inside.winfo_height()
                    self.roomList.canvas.yview_moveto(fraction)
        
    def getTextFromEvent(self,event,tag):
        index = event.widget.index("@%s,%s" % (event.x, event.y))
        tag_indices = list(event.widget.tag_ranges(tag))
        for start, end in zip(tag_indices[0::2], tag_indices[1::2]):
            if event.widget.compare(start, '<=', index) and event.widget.compare(index, '<', end):
                text=(event.widget.get(start, end))
                return text
                
    def copyText(self,wT):
        self.parent.clipboard_clear()
        self.parent.clipboard_append(wT)
        
    def spawnContext(self,event):

        x,y=event.x_root-self.parent.winfo_x(),event.y_root-self.parent.winfo_y()
        c=ContextMenu(self.parent)

        if x>=(self.parent.winfo_width()-158):
            x=(self.parent.winfo_width()-158)

        if y>(self.parent.winfo_height()-48):
            y=(self.parent.winfo_height()-48)

        c.place(x=x,y=y)

        return c

    def onMousewheel(self,event):
        if hasattr(event.widget,'parent'):
            if event.widget.parent in [self.roomList,self.userList]:
                if event.widget.parent.scrollbar.active:
                    event.widget.parent.canvas.yview_scroll(int(-1*(event.delta/120)), "units")

    def checkMessages(self):
        if not self.connection.queue.empty():#checks if queue is empty

            msgs = self.connection.queue.get_nowait() #gets messages from queue

            for msg in msgs: #loops through messages
                package=ast.literal_eval(msg) #interprets each message
                self.handlePackage(package) #handles the package
                
        self.after(10,self.checkMessages) #checks for more messages 10 ms later

    def handlePackage(self,package):
        if package['type']=='room+users':
            self.rooms=package['roomList'] 
            self.users=package['userList']
            self.connection.username=self.users['online'][-1]

            self.createRooms(self.rooms)
            self.makeSides(self.users,self.rooms)

        if package['type'] == 'userList':
            self.users=package['userList']
            self.userList.fill(self.users)

        if package['type'] == 'roomList':
            self.rooms=package['roomList']
            self.roomList.fill(self.rooms,select=True)

            for i in self.rooms:
                if i not in self.chatrooms.keys():
                    self.currentRoom
                    self.chatrooms[i]=Center(self,bg=colours['center'])
                    self.chatrooms[i].grid(column=2,row=1,sticky='nsew')
            self.chatrooms[self.currentRoom].tkraise()

        elif package['type']=='message':
            message=package['message']
            sender=package['sender']
            chatroom=package['chatroom']
            datetime=package['datetime']

            self.chatrooms[chatroom].addMessage(sender,datetime,message)
            
        elif package['type']=='dmMessage':
            to = package['to']
            xfrom = package['from']
            datetime=package['datetime']
            message=package['message']
            myUser=self.parent.connection.username
            if to==myUser:
                self.dm(xfrom)
                self.chatrooms[xfrom].addMessage(xfrom,datetime,message)
            if xfrom == myUser:
                self.chatrooms[to].addMessage(myUser,datetime,message)

    def createRooms(self,rooms):

        self.chatrooms={}

        for i in rooms:
            self.chatrooms[i]=Center(self,bg=colours['center'])
            self.chatrooms[i].grid(column=2,row=1,sticky='nsew')

        self.currentRoom=rooms[0]

    def makeSides(self,users,rooms):

        self.roomList=Sidelist(self,clickable=True,width=leftBarSize,bg=colours['leftSide'])
        self.roomList.makeBottom()
        self.userList=Sidelist(self,clickable=False,width=rightBarSize,bg=colours['rightSide'])

        self.userList.fill(users)
        self.roomList.fill(rooms,select=True)

        self.roomList.select(item=self.roomList.contents[0])
        
        self.userList.grid(column=3,row=1,sticky='ns')
        
        self.roomList.grid(column=1,row=1,sticky='ns')


        self.grid_columnconfigure(2,weight=1)
        self.grid_rowconfigure(1,weight=1)
        
class Center(tk.Frame):
    def __init__(self,parent,type='',*args,**kwargs):
        tk.Frame.__init__(self,parent,*args,**kwargs)
        self.parent=parent
        self.type=type
        self.createWidgets()
        self.gridWidgets()
        self.text.config(yscrollcommand=self.scrollbar.set)
        self.text.config(state='disabled')
        self.entry.bind('<Return>',self.sendmsg)   

        self.text.tag_configure("sender", font="Arial 12 bold")
        self.text.tag_configure("message", font="Arial 10",lmargin2=70)
        self.text.tag_configure("date", font="Arial 8")

        self.msgCount=0

    def addMessage(self,sender,dt,message):

        self.text.config(state='normal')

        height=40

        self.parent.userList.setColour(sender)

        colour=self.parent.userList.itemColours[sender]

        button1 = tk.Canvas(self.text,width=height,height=height/2,bg=colour,highlightthickness=0,relief='flat')
        button2 = tk.Canvas(self.text,width=height,height=height/2,bg=colour,highlightthickness=0,relief='flat')
        
        letter=sender[0]
        button1.create_text(height/2,height/2,fill='#ffffff',text=letter)
        button2.create_text(height/2,0,fill='#ffffff',text=letter)

        if self.text.get("1.0", 'end-1c')!='':
            self.text.insert("end","\n\n")
        else:self.text.insert("end","\n")
            
        self.text.window_create('insert', window=button1,padx=15)

        self.text.insert("end", sender.title(),"sender")
        dt=self.getRelDate(dt)
        self.text.insert("end", ' '+dt+'\n','date')

        self.text.window_create('insert', window=button2,padx=15)
        self.text.insert("end", message, 'message')
        self.text.see('end')
        self.text.config(state='disabled')

        self.msgCount+=1


    def getRelDate(self,dt):
        ob=datetime.strptime(dt,"%Y-%m-%d %H:%M:%S")
        today=ob.today()
        if ob.date()==today.date():
            return "Today at "+str(ob.strftime("%H:%M"))
        elif ob.date()==((today-timedelta(1)).date()):
            return "Yesterday at "+str(ob.strftime("%H:%M"))
        else:
            return str(ob.strftime("%d/%m/%Y at %H:%M"))

    def gridWidgets(self):
        
        self.send.grid(column=2,row=2,sticky='we',pady=5,padx=5)
        self.entry.grid(column=1,row=2,sticky='we',padx=(15,0),pady=20,ipady=15)

        self.scrollbar.grid(column=3,row=1,sticky='ns')
        self.text.grid(column=1,row=1,columnspan=2,sticky='nsew',padx=(0,10))
        
    
        self.grid_rowconfigure(1,weight=1)
        self.grid_columnconfigure(1,weight=1)

    def createWidgets(self):
        
        self.text=tk.Text(self,bg=colours['center'],fg='#ffffff',
                            borderwidth=0,
                            selectbackground='#264F78')

        self.scrollbar=AutoScrollbar(self,command=self.text.yview)

        self.entry=tk.Entry(self,borderwidth=0,
                            highlightthickness=0,
                            font = "Whitney 13",
                            bg=colours['entry'],
                            fg=colours['fg'],
                            insertbackground=colours['fg'])
        
        self.send=tk.Button(self,text='Send',command=self.sendmsg,
                            relief='flat',font='Arial 10 bold',
                            bg=colours['entry'],
                            fg=colours['fg'],
                            width=15,height=2,
                            activebackground=colours['entry'],
                            activeforeground=colours['fg'],
                            borderwidth=0)

    def steriliseEntry(self,text):
        text=text.replace('/7/4534','')
        text=text.replace('END','')
        return text

    def sendmsg(self,event=None):
        text=self.entry.get()
        text=self.steriliseEntry(text)
        if text:
            if self.type=='dm':
                p={'type':'dmMessage','to':self.parent.currentRoom,'message':text[:2000],'from':self.parent.connection.username,
                   'datetime':datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
            elif self.type=='group':
                p={'type':'message','chatroom':self.parent.currentRoom,'message':text[:2000],'sender':self.parent.connection.username,
                   'datetime':datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
            else:
                p={'type':'message','chatroom':self.parent.currentRoom,'message':text[:2000],'sender':self.parent.connection.username,
                   'datetime':datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
            
            self.parent.connection.sendPackage([p])
            self.entry.delete(0, 'end')
        
class Sidelist(ScrollableFrame):
    def __init__(self,parent,clickable=False,*args,**kwargs):
        ScrollableFrame.__init__(self,parent,*args,**kwargs)
        
        self.parent=parent
        self.contents=[]
        self.names=[]
        self.clickable=clickable

        self.itemColours={}

    def makeBottom(self):
        width=self.cget('width')
        self.options=tk.Frame(self,bg='#2b282f',height=40)

        photo=tk.PhotoImage(file=cog)
        self.settings=tk.Button(self.options,bg='#2b282f',image=photo,highlightthickness=0,borderwidth=0)
        self.settings=HoverButton(self.options,bg='#2b282f',image=photo,bd=0,activebackground='#322f36')
        self.settings.image=photo
        self.settings.grid(column=3,row=1,padx=10,pady=10)
        
        self.name=tk.Label(self.options,font='Arial 12 bold',fg='#ffffff',bg='#2b282f',text=self.parent.connection.username)
        self.name.grid(column=1,row=1,padx=((1/4)*width)-20)
        self.options.grid(sticky='we')

        self.options.grid_columnconfigure(2,weight=1)
        
    def addItem(self,text='Default',type='',colour=None):

        b=item(self,text=text.title(),type=type,colour=colour,bg=self.cget('bg'),height=60)
        b.pack(fill='x')
        if self.clickable:
            b.bind('<ButtonRelease-1>', self.select)

        self.contents.append(b)
        self.names.append(text)
        return b
        

    def fill(self,items,select=False):

        if not select:
            offline=items['offline']
            items=items['online']
                    
        left=[i for i in self.contents if i.text not in items]
        joined=[i for i in items if i not in [n.text for n in self.contents]]
        
        for i in left:
            i.destroy()
        for i in joined:
            self.addItem(i)

        if hasattr(self,'x'):
            self.x.destroy()
        
        if not select:
            self.x=tk.Label(self.inside,text='OFFLINE-{}'.format(len(offline)),bg=colours['rightSide'],fg='#ffffff',anchor='sw',font='Arial 9 bold')
            width=self.cget('width')
            self.x.pack(fill='x',pady=(15,0),padx=((1/4)*width)-20)
            for i in offline:
                self.addItem(i)
        self.checkScroll()

    def select(self,event=None,item=None):

        if event:
            item=event.widget

        if not item.isInitalized:
            p={'type':'fetch','param':'chatroom','chatroom':item.text}
            self.parent.parent.connection.sendPackage([p])
            item.isInitalized=True
            
            
        self.parent.chatrooms[item.text].tkraise()
        self.parent.chatrooms[item.text].entry.focus()
        
        self.parent.currentRoom=item.text
        
        for i in self.contents:
            i.config(bg=self.cget('bg'))
        item.config(bg="#2F3C45")

    def setColour(self,text):
        if text not in self.itemColours:
            h,s,l = random.random(), 0.5 + random.random()/2.0, 0.4 + random.random()/5.0
            r,g,b = [int(256*i) for i in colorsys.hls_to_rgb(h,l,s)]
            colour= '#%02x%02x%02x' % (r,g,b)
        
            self.itemColours[text]=colour
        
class item(tk.Canvas):
    def __init__(self,parent,type='',text='',colour=None,height=0,*args,**kwargs):
        
        tk.Canvas.__init__(self,parent.inside,height=height,highlightthickness=0,*args,**kwargs)
        self.parent=parent
        width=self.parent.cget('width')
        self.config(width=width)

        self.isInitalized=False
        self.text=text
        self.width=width
        self.height=height
        self.type=type

        if not colour:
            self.parent.setColour(text)
            self.colour=self.parent.itemColours[text]
        else:
            self.colour=colour
        
        self.normalCreation()

    def normalCreation(self):
        width=self.width
        height=self.height
        type=self.type
        text=self.text
        size=20
        if text[:4]=='Year':
            short=text.title().split(' ')[-1]
        else:short=text.title()[0]
        self.create_rectangle((width/4)-size,(height/2)-size,(width/4)+size,(height/2)+size,fill=self.colour)

        self.ctid=self.create_text((width/4)+size+10,(height/2),text=text,fill='#ffffff',anchor='w',font='Arial 10 bold')        
        self.create_text((((width/4)-size)+(width/4)+size)/2,(((height/2)-size)+(height/2)+size)/2,text=short,fill='#ffffff',font='Arial 10 bold')

        if type=='dm':
            rect=self.create_rectangle(250,height/2-(size/2),250+size,(height/2)+(size/2),fill='grey',tags='close')
            txt=self.create_text((250+(250+size))/2,(height/2-(size/2)+(height/2)+(size/2))/2,text='❌',tags='close')

            self.tag_bind(txt, '<ButtonRelease-1>', self.close)       
            self.tag_bind(rect, '<ButtonRelease-1>', self.close)
    def close(self,event):
        
        self.destroy()
        self.parent.parent.chatrooms[self.text].destroy()
        self.parent.names.remove(self.text)
        self.parent.contents.remove(self)
        del self.parent.parent.chatrooms[self.text]
        self.parent.select(item=self.parent.contents[0])


    def inpName(self):

        self.box=tk.Entry(self)
        self.bid=self.create_window(165,30,window=self.box)
        self.box.bind('<Return>',self.enter)
        self.parent.checkScroll()
        self.parent.canvas.yview_moveto(1)

    def enter(self,event=None):
        self.text=self.box.get().title()
        self.delete(self.bid)
        self.delete(self.ctid)
        self.normalCreation()
        self.parent.parent.chatrooms[self.text]=Center(self.parent.parent,bg=colours['center'],type='group')

        self.parent.parent.chatrooms[self.text].grid(column=2,row=1,sticky='nsew')

        p={'type':'newGroup','name':self.text,'creator':self.parent.parent.connection.username,'datetime':datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
        self.parent.parent.connection.sendPackage([p])
