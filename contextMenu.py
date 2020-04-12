import tkinter as tk

class ContextMenu(tk.Frame):
    def __init__(self,parent):
        tk.Frame.__init__(self, parent)

        self.buttons=[]

        self.parent=parent

        self.config(bg='#18191c')
        
        self.grab_set()

        self.bind('<Button-1>',self.remove)
        self.bind('<Button-3>',self.remove)

    def remove(self,event=None,**kwargs):
        if 'command' in kwargs:
            command=kwargs['command']
            del kwargs['command']
            command(**kwargs)
        self.destroy()
        
    def add(self,text='Text',**kwargs):
        b=HoverButton(self,text=text,width=15,
                    height=2,anchor="w",relief='flat',
                      activebackground='#212326',
                      bg='#18191c',fg='#ffffff',padx=13,
                      font="Arial 10",highlightthickness=0, bd = 0,
                      activeforeground='#ffffff')

        b.bind('<ButtonRelease-1>',lambda event: self.remove(event,**kwargs))
    
        b.pack(fill='both',expand=True,padx=5,pady=5)

        self.buttons.append(b)


class HoverButton(tk.Button):
    def __init__(self, master, **kw):
        tk.Button.__init__(self,master=master,**kw)
        self.parent=master
        self.defaultBackground = self["background"]
        self.bind("<Enter>", self.on_enter)
        self.bind("<Leave>", self.on_leave)
        
    def on_enter(self, e):
        self['background'] = self['activebackground']

    def on_leave(self, e):
        self['background'] = self.defaultBackground