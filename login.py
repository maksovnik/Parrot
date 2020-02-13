import tkinter as tk
from tkinter import ttk
import socket
from chat import Chat
from constants import *
import time

class Login(tk.Frame):
    
    def __init__(self,parent,*args,**kwargs):
        
        tk.Frame.__init__(self, parent,*args,**kwargs)
        
        self.parent = parent
        
        self.forms=[]
        self.makeInner()
        self.gridWidgets()
        
    def makeInner(self):

        self.inner=tk.Frame(self,bg=colours['loginInner'])
        self.makeWidgets(self.inner)
        self.inner.grid(column=1,row=1)

    def makeEntry(self,widget=None,column=None,row=None,text=None,pady=10):

        l=tk.Label(widget,text=text,bg=colours['loginInner'],fg='#8a8e93')
        e=ttk.Entry(widget,justify='left',width=30,style='login.TEntry')
        self.forms.append(e)

        l.grid(column=column,row=row,sticky='w',padx=55,pady=pady)
        e.grid(column=column,row=row+1,sticky='we',padx=55)
  
        
    def makeWidgets(self,widget):

        self.bind_all('<Return>',self.onSubmit)
        self.banner=tk.Label(widget,bg=colours['loginInner'])
        self.applyImage(self.banner,img=banner)
        
        self.submit = tk.Button(widget,text='Submit',
                                command=self.onSubmit,
                                highlightthickness = 0,
                                relief='flat',
                                bg='#7289D9',
                                fg='#e4e5e5',
                                
                                width=10,
                                font='Arial 20 bold',
                                activebackground='#7289D9',
                                activeforeground=colours['fg'])
        
        self.makeEntry(widget,text='School ID',column=1,row=3,pady=(0,10))
        self.makeEntry(widget,text='Username',column=1,row=5)

        self.makeEntry(widget,text='Password',column=1,row=7)

        self.error = tk.Label(widget,bg=colours['loginInner'],fg=colours['fg'])

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

        self.banner.grid(column=1,row=2,padx=20,pady=20)
        self.submit.grid(column=1,row=9,pady=(20,0))
        self.error.grid(column=1,row=10)

        self.grid_columnconfigure(0,weight=1)
        self.grid_columnconfigure(2,weight=1)
        
        self.grid_rowconfigure(1,weight=1)
        self.grid_rowconfigure(3,weight=1)

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

        except (ConnectionRefusedError,socket.timeout,TimeoutError) as e:
            self.error.config(text="Can't connect to server - please retry")
