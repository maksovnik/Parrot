import tkinter as tk
from tkinter import ttk
from ctypes import windll
from tkinter import messagebox
import time
from networking import Connection
from login import Login
from topbar import Bar

from constants import *

class MainWindow(tk.Tk):
    def __init__(self):
        tk.Tk.__init__(self)

        self.overrideredirect(True)
        self.setSize(loginWidth,loginHeight)

        self.makeWidgets()
        self.gridWidgets()

        self.applyStyles()
        self.title('Parrot')
        self.config(bg=colours['sides'])
        self.tk.call('wm', 'iconphoto', self._w, tk.PhotoImage(master=self,file=icon))
        self.connection=Connection(self)

        self.after(10,self.keepInTaskbar)

    def applyStyles(self):
        style=ttk.Style()
        style.theme_use('clam')

        
        style.configure("Vertical.TScrollbar", gripcount=0,
                        background=colours['sides'],
                        darkcolor=colours['scrollbarDark'],
                        lightcolor=colours['scrollbarLight'],
                        troughcolor=colours['center'],
                        bordercolor=colours['sides'],
                        arrowcolor=colours['scrollbarArrow'])

        style.configure('login.TEntry',
                        padding=[5, 10, 5, 10],
                        fieldbackground=colours['entry'],
                        foreground='#e6e6e7',
                        relief='flat',
                        borderwidth=0,
                        selectborderwidth=0)
        
    def makeWidgets(self):
        
        self.bar=Bar(self)

        self.login=Login(self,bg=colours['sides'])

        self.corner=self.makeBorder(cursor='size_nw_se')
        self.bottom=self.makeBorder(cursor='sb_v_double_arrow')
        self.right=self.makeBorder(cursor='sb_h_double_arrow')

        self.borders=[self.right,self.bottom,self.corner]

    def makeBorder(self,cursor='',command=None):
        size=8
        border=tk.Frame(self,bg=colours['sides'],cursor=cursor,height=size,width=size)
        border.bind('<B1-Motion>',self.resize)
        return border
    
    def gridWidgets(self):
        
        self.bar.grid(column=1,row=1,sticky='we',columnspan=2)
        self.login.grid(column=1,row=2,sticky='nsew')
        
        self.bottom.grid(column=1,row=3,sticky='we')
        
        self.right.grid(column=2,row=2,sticky='nse')
        self.corner.grid(column=2,row=3,sticky='nsew')

        self.grid_columnconfigure(1,weight=1)
        self.grid_rowconfigure(2,weight=1)

    def keepInTaskbar(self):
        
        hwnd = windll.user32.GetParent(self.winfo_id())
        style = windll.user32.GetWindowLongPtrW(hwnd, GWL_EXSTYLE)
        style = style & ~WS_EX_TOOLWINDOW
        style = style | WS_EX_APPWINDOW
        res = windll.user32.SetWindowLongPtrW(hwnd, GWL_EXSTYLE, style)
        self.wm_withdraw()
        self.after(10, lambda: self.wm_deiconify())

    def resize(self,event):
        px,py = self.winfo_pointerxy()
        rx,ry = self.winfo_rootx(),self.winfo_rooty()
        ww,wh= self.winfo_width(),self.winfo_height()
        
        if event.widget==self.right:
            self.geometry("%sx%s" % (px-rx,wh))   
        elif event.widget==self.bottom:
            self.geometry("%sx%s" % (ww,(py-ry)))
        elif event.widget==self.corner:
            self.geometry("%sx%s" % ((px-rx),(py-ry)))

    def setSize(self,w,h):

        ws = self.winfo_screenwidth()
        hs = self.winfo_screenheight()

        x = (ws/2) - (int(w)/2)
        y = (hs/2) - (int(h)/2)

        self.geometry('%dx%d+%d+%d' % (int(w), int(h), x, y))

root=MainWindow()
root.mainloop()
