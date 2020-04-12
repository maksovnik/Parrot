import tkinter as tk
from tkinter import ttk

class ScrollableFrame(tk.Frame):
    def __init__(self,parent,width=200,*args,**kwargs):
        tk.Frame.__init__(self,parent,width=width,*args,**kwargs)
        self.parent=parent
        self.canvas=tk.Canvas(self,highlightthickness=0,width=width,**kwargs)
        self.inside=tk.Frame(self.canvas,width=width,**kwargs)
        self.canvas.grid(column=0,row=0,sticky='nsew')
        self.cf=self.canvas.create_window(0,0,window=self.inside,anchor='nw')

        self.createScrollbar()

        self.canvas.bind('<Configure>',self.checkScroll)

        self.grid_columnconfigure(0,weight=1)
        self.grid_rowconfigure(0,weight=1)
        
    def createScrollbar(self):
        self.scrollbar=AutoScrollbar(self,command=self.canvas.yview)
        self.canvas.config(yscrollcommand=self.scrollbar.set)
        self.scrollbar.grid(column=1,row=0,sticky='ns')

        self.checkScroll()

    def checkScroll(self,event=None):
        self.update_idletasks()
        
        contentheight=self.canvas.bbox("all")

        self.canvas.config(scrollregion=contentheight) 
            
class AutoScrollbar(ttk.Scrollbar):
    def __init__(self,*args,**kwargs):
        ttk.Scrollbar.__init__(self,*args,**kwargs)
        self.active=False
    def grid(self,*args,**kwargs):
        ttk.Scrollbar.grid(self,*args,**kwargs)
        self.active=True   
    def set(self, lo, hi):
        if float(lo) <= 0.0 and float(hi) >= 1.0:
            self.grid_remove()
            self.active=False
        else:
            self.grid()
        ttk.Scrollbar.set(self, lo, hi)
