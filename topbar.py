import tkinter as tk
from constants import *
from win32api import GetMonitorInfo, MonitorFromPoint

class Bar(tk.Frame):

    def __init__(self,parent):
        tk.Frame.__init__(self,parent,bg=colours['sides'])

        self.parent=parent
        self.makeIcon()
        self.makeLabel()
        
        self.max='normal'
        self.min='false'
    
        self.workarea=self.getWorkArea()
        self.close=self.makeButton(text='❌',colour='red',command=self.onClose)

        self.makeButton(text='⬜',colour='#525252',anchor='s',command=self.maximise)
        self.makeButton(text=('―'),colour='#525252',command=self.minimise,anchor='s')
        
        self.bind("<Map>",self.frame_mapped)
        self.bind('<ButtonPress-1>',self.clickwin)
        self.bind('<B1-Motion>',self.dragwin)

    def getWorkArea(self):
        monitorinfo = GetMonitorInfo(MonitorFromPoint((0,0)))
        workarea = monitorinfo.get("Work")
        result=(str(workarea[2]),str(workarea[3]))
        return result

    def onClose(self):
        if hasattr(self.parent,'connection'):
            self.parent.connection.onClose()
        else:        
            self.parent.destroy()
        
    def makeIcon(self):
        canvas = tk.Canvas(self,bg=colours['sides'], width=30, height=30,highlightthickness=0)
        canvas.pack(side='left')

        img = tk.PhotoImage(file='img/icon.png')
        canvas.create_image(15,15,image=img)
        canvas.image=img

    def makeLabel(self):
        l=tk.Label(self,text='Parrot',bg=colours['sides'],fg=colours['fg'],font='Arial')
        l.pack(side='left')
        
    def makeButton(self,text='Default',colour=colours['fg'],anchor='center',command=None):
        
        b=tk.Button(self,text=text,fg=colours['fg'],
                        font=('Arial',10,'bold'),
                        width=3,bg=colours['sides'],
                        relief='flat',anchor=anchor,
                        activebackground=colours['sides'],
                        command=command)

        b.bind("<Enter>", lambda event, colour=colour: self.buttonEnter(event,colour=colour))
        b.bind("<Leave>", lambda event, colour=colour: self.buttonLeave(event,colour=colour))
        b.pack(side='right',ipadx=6)
        return b
    
    def maximise(self,event=None):

        if self.max=='normal':
            self.max='zoomed'
            self.old=self.parent.winfo_geometry()
            self.parent.geometry(self.workarea[0]+'x'+self.workarea[1]+'+0+0')
            
            for i in self.parent.borders:
                i.grid_remove()
        else:
            self.max='normal'
            self.parent.geometry(self.old)
            
            for i in self.parent.borders:
                i.grid()

            
    def minimise(self, event=None):
        self.parent.overrideredirect(False)
        self.parent.state('iconic')
    def frame_mapped(self,e):
        
        self.parent.overrideredirect(True)
        self.parent.state('normal')

    def buttonEnter(self,event=None,colour=colours['fg']):
        event.widget['background']=colour
    def buttonLeave(self,event=None,colour=colours['fg']):
        event.widget['background']=colours['sides']

    def dragwin(self,event):
        if hasattr(self,'offsetx') and hasattr(self,'offsety'):
            x = self.parent.winfo_pointerx() - self.offsetx
            y = self.parent.winfo_pointery() - self.offsety
            self.parent.geometry('+{x}+{y}'.format(x=x,y=y))

    def clickwin(self,event):
        self.offsetx = event.x
        self.offsety = event.y

