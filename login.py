import tkinter as tk
from tkinter import ttk
import socket
from chat import Chat
from constants import *
import webbrowser

class Login(tk.Frame):
    
    def __init__(self,parent,*args,**kwargs):
        tk.Frame.__init__(self, parent,*args,**kwargs)
        self.parent = parent
        self.forms=[]
        self.makeInner()
        self.gridWidgets()
        
    def makeInner(self):
        self.inner=tk.Frame(self,bg=colours['loginInner'])
        self.makeWidgets()

    def makeEntry(self,show='',column=None,row=None,text=None):
        l=tk.Label(self,text=text,bg=colours['loginInner'],fg='#8a8e93')
        e=ttk.Entry(self,justify='left',width=30,style='login.TEntry',show=show)
        self.forms.append(e)

        l.grid(column=1,row=row,sticky='w')
        e.grid(column=2,row=row,sticky='we')
        
    def makeWidgets(self):

        self.bind_all('<Return>',self.onSubmit)
        self.banner=tk.Label(self,bg=colours['loginInner'])
        self.applyImage(self.banner,img=banner)
        
        self.submit = tk.Button(self,text='Login',
                                command=self.onSubmit,
                                highlightthickness = 0,
                                relief='flat',
                                bg='#7289D9',
                                fg='#e4e5e5',
                                
                                width=10,
                                font='Arial 20 bold',
                                activebackground='#7289D9',
                                activeforeground=colours['fg'])

        self.makeEntry(text='School ID:',row=2)
        self.makeEntry(text='Username:',row=3)
        self.makeEntry(text='Password:',show='*',row=4)
    
        self.signup=tk.Label(self,bg=colours['loginInner'],fg=colours['fg'],text='Sign Up')
        self.signup.bind("<Button-1>", lambda e: webbrowser.open_new("https://parrotchat.co.uk/ac/register.php"))
        self.error = tk.Label(self,bg=colours['loginInner'],fg=colours['fg'],font='Arial 10 bold')


        self.debug()
        
    def debug(self):
        details=['ctk','maks','pass'] 
        for i,z in zip(self.forms,details):
            i.insert(tk.END,z)
    def applyImage(self,widget,img):
        
        imgObj=tk.PhotoImage(master=self,file=img)
        widget.config(image=imgObj)
        widget.image=imgObj
        
    def gridWidgets(self):

        self.banner.grid(column=1,row=1,columnspan=2,pady=(0,10))
        self.submit.grid(column=1,row=9,pady=(20,0),columnspan=2)
        self.error.grid(column=1,row=11,columnspan=2)
        self.signup.grid(column=1,row=12,columnspan=2)
        

        self.grid_rowconfigure(0,weight=1)
        self.grid_rowconfigure(50,weight=1)
        self.grid_columnconfigure(0,weight=1)
        self.grid_columnconfigure(50,weight=1)

    def onSubmit(self,event=None):
        try:
            connection=self.parent.connection
            schoolID,username,password=[i.get() for i in self.forms]
            connection.connect(schoolID,username,password)
            
            msg=connection.recvPackage()[0]

            if msg=='Logged In':
                self.unbind_all('<Return>')
                connection.startRecvThread()
                self.parent.chat=Chat(self.parent,connection)
            else:
                self.error.config(text=msg)

        except (ConnectionRefusedError,socket.timeout,TimeoutError):
            self.error.config(text="Can't connect to server - please retry")
