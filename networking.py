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
        print('----------------I AM THE CLIENT----------------\n')
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
        self.serverPublic=int(self.recvPackage(encrypted=False)[0])
    
        key=pow(self.serverPublic,self.private,n)
        key=HKDF(str(key).encode(), 32, None, SHA512, 1)
        
        print('Client private key is:',hex(self.private))
        print('\nClient public key is:',hex(self.public))
        print('\nRecieved server key is:',hex(self.serverPublic))
        print('\nSecret Comm Key:',key.hex())
        print('\nEncryption Channel Established!!')

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
        self.sendPackage([{'type':'quit'}])
        self.parent.destroy()

    def recvPackage(self,encrypted=True):
        
        string='' #declares an empty string
        while True: #runs forever
            msg=self.sock.recv(self.BUFSIZ).decode() #waits until message recieved
                 
            string+=msg #concatenates the message to string
            if string[-3:]=='END':
                break #breaks the loop if message end is reached
            
        x = string[:-3] #cuts the end character from string
        x=x.split('/7/4534') #seperates messages
        x=[i.split('END') for i in x ] #puts messages in list
        x=sum(x, []) #converts 2d list to 1d list
        
        if encrypted: #if decryption is required the messages are decrypted
            x=[self.decrypt(i) for i in x]

        return x #returns list of messages

    def sendPackage(self,msgs,encrypt=True):

        message=str(msgs[0])
        
        if encrypt:
            message=self.encrypt(message)
        
        message=message+'END'

        self.sock.send(message.encode())
