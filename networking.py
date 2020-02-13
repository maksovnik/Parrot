import tkinter as tk
import queue
import socket
from threading import Thread
from constants import host,n,G
import random

from Crypto.Cipher import AES
from Crypto.Protocol import HKDF
from Crypto.Hash import SHA512

class Connection:
    
    def __init__(self,parent):
        
        self.parent=parent
        self.host=host
        self.queue = queue.Queue()
        
        self.parent.protocol("WM_DELETE_WINDOW", self.onClose)
 
    def connect(self,schoolID,username,password):
        
        self.PORT = 2002
        self.BUFSIZ = 16384
        self.ADDR = (self.host, self.PORT)
        
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.sock.settimeout(2)
        self.sock.connect(self.ADDR)

        self.sock.settimeout(None)
        
        self.diffieHelman()

        self.sendPackage([schoolID+','+username+','+password])


    def pad(self,s):
        return s + ((16-len(s) % 16) * '`')

    def encrypt(self,plaintext):
        b=self.cipher.encrypt(self.pad(plaintext).encode())
    
        return b.hex()

    def decrypt(self,ciphertext):
        
        ciphertext=bytes(bytearray.fromhex(ciphertext))
        
        dec = self.cipher.decrypt(ciphertext)
        dec=dec.decode('utf-8')
        l = dec.count('`')
        return dec[:len(dec)-l]

    def diffieHelman(self):
        self.private=random.randint(1,n)

        self.public=pow(G,self.private,n)
        self.sendPackage([str(self.public)],encrypt=False)

        self.serverPublic=int(self.recvPackage(encrypt=False)[0])

        key=pow(self.serverPublic,self.private,n)

        
        key=HKDF(str(key).encode(), 32, None, SHA512, 1)
        print('\nSecret Comm Key:\n',key.hex(),'\n')

        self.cipher=AES.new(key,AES.MODE_ECB)
    
    def startRecvThread(self):
        self.receive_thread = Thread(target=self.recieve)
        self.receive_thread.daemon=True
        self.receive_thread.start()

    def recieve(self):
        try:
            while True:
                msg = self.recvPackage()
                self.queue.put(msg)
                
        except (ConnectionResetError,ConnectionAbortedError):
            pass
            

    def onClose(self):
        try:
            self.sock.close()
        except:
            pass
        
        self.parent.destroy()


    def recvPackage(self,encrypt=True):
        
        string=''
        while True:
            msg=self.sock.recv(self.BUFSIZ).decode()
                 
            string+=msg
            if string[-3:]=='END':
                break
            
        x = string[:-3]
        x=x.split('/7/4534')
        x=[i.split('END') for i in x ]
        x=sum(x, [])
        
        if encrypt:
            x=[self.decrypt(i) for i in x]

        return x


    def sendPackage(self,msgs,encrypt=True):

        message=str(msgs[0])
        
        if encrypt:
            before=message
            
            message=self.encrypt(message)
            print(('\nEncrypted Message ({}):\n').format(before),message)
        
        message=message+'END'

        self.sock.send(message.encode())