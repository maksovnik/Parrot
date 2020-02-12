from socket import AF_INET, socket, SOCK_STREAM
import socket as s
from threading import Thread
import mysql.connector
import ast
import time
import datetime
import random

from Crypto.Cipher import AES
from Crypto.Protocol import HKDF
from Crypto.Hash import SHA512

import bcrypt



G=2
n = 19734900040940404664644305615517238200212737175723279495859664156912668581028626844565624073416930176658640903580121503424187075146581792121169366619768962912386932913035391380374152854390654320238159350999950760196043670547034246552641205036156304454114742591861285315528651792639509005687918434719606041598759632146313746054686415079747239188388174259165477084624911519924254250193142157594028121418869456159224309692587572801705369036200731722831092555576381490521445478978824802735386346431892032437482199817068803449197481051775442393900111881542447488099020087307856765855565090642652903369470287423296353531069

class server:
    
    def __init__(self):

        self.buffer = 16384
        self.address = ('0.0.0.0', 2002)
        self.colWidth=20
        self.schools={}
        self.ciphers={}

        self.initializeSocket()

        print("SERVER RUNNING - WAITING FOR CONNECTIONS...")
        print('-'*145)
        self.printRow(['Status','IP','SchoolID','School','Username','Password','Datetime'])
        
        self.startAcceptingConnections()
        
    def printRow(self,info):
        print('|'.join(('%*s' % (self.colWidth, i) for i in info)))

    def initializeSocket(self):

        try:
            self.sock = socket(AF_INET, SOCK_STREAM)
            self.sock.bind(self.address)
            self.sock.listen(5)
        except OSError:
            print('Server failed to start on port {}\nTry to restart and check port configuration'.format(self.address[1]))
            exit()
            

    def startAcceptingConnections(self):
        
        accept_thread = Thread(target=self.acceptConnections)
        accept_thread.start()
        accept_thread.join()
        
    def acceptConnections(self):
        while True:
            client, client_address = self.sock.accept()
            Thread(target=self.handleClient, args=(client,)).start()

    def insertMessageToDB(self,package,school):
        message=package['message']
        chatroom=package['chatroom']
        user=package['sender']
        id2=self.getChatroomID(school,chatroom)

        statement="""INSERT into messages
                    (message,sender,school,chatroom)
                    VALUES (%s,%s,%s,%s)"""

        self.cursor.execute(statement,(message,user,school,id2))
        self.db.commit()

    def insertDMtoDB(self,package,school):
        message=package['message']
        xTo=package['to']
        xFrom=package['from']

        statement="""INSERT into dms
            (message,xTo, xFrom, school)
            VALUES (%s,%s,%s,%s)"""

        self.cursor.execute(statement,(message,xTo,xFrom,school))
        self.db.commit()


    def recvPackage(self,client,encrypt=True):
        
        string=''
        while True:
            msg=client.recv(self.buffer).decode()
            
                 
            string+=msg
            if string[-3:]=='END':

                break
            
        x = string[:-3]
        x=x.split('/7/4534')
        x=[i.split('END') for i in x ]
        x=sum(x, [])

        if encrypt:
            x=[self.decrypt(i,self.ciphers[client]) for i in x]
        
        return x

    def sendPackage(self,client,msgs,encrypt=True):

        for i in range(len(msgs)):
            message=str(msgs[i])
            
            if encrypt:
                before=message
                message=self.ciphers[client].encrypt(self.pad(before).encode()).hex()
                
                
            if i==len(msgs)-1:
                message=message+'END'

            else:
                message=message+'/7/4534'
                

            client.send(message.encode())

    def pad(self,s):
        return s + ((16-len(s) % 16) * '`')
    
    def decrypt(self,ciphertext,cipher):
        
        ciphertext=bytes(bytearray.fromhex(ciphertext))
        
        dec = cipher.decrypt(ciphertext)
        dec=dec.decode('utf-8')
        l = dec.count('`')
        return dec[:len(dec)-l]


   
    def handleClient(self,client):
        
                
        school = None
        
        private=random.randint(1,n)
        
        public=pow(G,private,n)
        
        self.sendPackage(client,[public],encrypt=False)
        clientPublic=int(self.recvPackage(client,encrypt=False)[0]) #(g^a)%n
        
        commKey=pow(clientPublic,private,n)

        commKey = HKDF(str(commKey).encode(), 32, None, SHA512, 1)
        cipher=AES.new(commKey,AES.MODE_ECB)
        self.ciphers[client]=cipher

        
        try:
            msg=self.recvPackage(client)[0]
            school,username,password= msg.split(',')
            
            sc,username=self.checkDB(client,school,username,password)

            if self.isClientAlive(client):
                while True:
                    msgs=self.recvPackage(client)
                    for msg in msgs:
                        package=ast.literal_eval(msg)

                        if package['type']=='message':
                            self.insertMessageToDB(package,school)

                            for i in self.schools[school]['clients']:
                                    self.sendPackage(i,[msg])
                                    
                        if package['type']=='dmMessage':

                            self.insertDMtoDB(package,school)
                                
                            for sock,info in self.schools[school]['clients'].items():
                                if info['username'] in [package['from'],package['to']]:
                                    self.sendPackage(sock,[package])
                                    
                        if package['type']=='fetch':
                            if package['param']=='dm':
                                requester=package['requester']
                                asoc=package['asoc']
                                dms=self.getDms(school,requester,asoc)
                                for sock,info in self.schools[school]['clients'].items():
                                    if info['username']==requester:
                                        self.sendPackage(sock,dms)
                                        
                            if package['param']=='chatroom':
                                chatroom=package['chatroom']
                                if chatroom in self.schools[school]['chatrooms']:
                                        
                                    msgs=self.getMessages(school,self.getChatroomID(school,chatroom))
                                    self.sendPackage(client,msgs)
                                    
                        if package['type']=='newGroup':
                            name=package['name']
                            creator=package['creator']
                            self.makeGroup(name,creator)
               
        except ConnectionResetError:
            if school !=None:
            
                del self.schools[school]['clients'][client]

                address=':'.join(str(i) for i in client.getpeername())
                info=['Disconnected',address,school,sc,username,password,str(datetime.datetime.now())[:-7]]
                self.printRow(info) 

                if self.schools[school]['clients']==[]:
                    del self.schools[school]
                client.close()

                userlist=self.getOnlineUsers(school)
                offline=self.getOfflineUsers(userlist,school)
                userlist={'online':userlist,'offline':offline}
            
                for i in self.schools[school]['clients']:
                    p={'userList':userlist,'type':'userList'}
                    self.sendPackage(i,[p])
    
    def getDms(self,school,xFrom,xTo):
        statement="SELECT * FROM dms WHERE school=%s and (xFrom=%s and xTo=%s) OR (xFrom=%s and xTo=%s)"
        self.cursor.execute(statement,(school,xFrom,xTo,xTo,xFrom))
        records = self.cursor.fetchall()        

        dms = [{'type':'dmMessage','message': row[0], 'from': row[1],'to':row[2],'datetime':str(row[4])} for row in records]
        return dms
    
    def checkRole(self,user):
        statement="SELECT role FROM users WHERE username=%s"
        self.cursor.execute(statement,(user))
        records = self.cursor.fetchall()
        return records[0][0]
        
    def isClientAlive(self,client):
        stat=client.fileno()
        if stat==-1:
            return False
        else:
            return True

    def connectDb(self):

        hostname='127.0.0.1'
        username='remote'
        password = 'remote'
        database = 'chat'
        port='3306'
       
        self.db = mysql.connector.connect(host=hostname, user=username, passwd=password, db=database, port=3306)
        self.cursor = self.db.cursor()

    def checkDB(self,client,schoolID,username,password):

            
        self.connectDb()
        
        schools=self.getSchoolMatches(schoolID)
        address=':'.join(str(i) for i in client.getpeername())

        if schools:
        

            school=schools[0][0]
            users=self.getUserMatches(schoolID,username,password)
            
            if users:
                username=users[0][0]
                email = users[0][3]
                valid = users[0][5]
                date=users[0][6]
                if valid:
                    
                    if schoolID not in self.schools:
                        self.addSchool(schoolID)
            
                    users=[i['username'] for i in self.schools['ctk']['clients'].values()]
                    if username not in users:
                        status='Connected'
                        self.sendPackage(client,['Logged In'])
                        self.addClient(username,client,schoolID)
                        
                    else:
                        status='alreadylogged'
                        self.sendPackage(client,['User logged in from another location'])
                        client.close()

                else:
                    status='notValid'
                    msg="""This account had not yet been verified.
                    An email was sent to {} on {}""".format(email,date)
                    self.sendPackage(client,[msg])
                    status='notVerified'
                    client.close()

            else:
                status='badDetails'
                self.sendPackage(client,['Incorrect details'])
                client.close()
            
        else:
            school='NA'
            status='badSchool'
            self.sendPackage(client,['School not Found'])
            client.close()

        self.addLog(status,address,schoolID,school,username)
        info=[status,address,schoolID,school,username,password,str(datetime.datetime.now())[:-7]]
        self.printRow(info)

        return school,username

    def addLog(self,status,address,schoolID,schoolName,username):

        statement="""INSERT into connections
            (status,address,schoolID,schoolName,username)
            VALUES (%s,%s,%s,%s,%s)"""

        self.cursor.execute(statement,(status,address,schoolID,schoolName,username))
        self.db.commit()
        
    def getSchoolMatches(self,schoolID):
        statement="SELECT * FROM schools WHERE id=%s"
        self.cursor.execute(statement,(schoolID,))
        records = self.cursor.fetchall()
        return records

    def getUserMatches(self,school,username,password):
        
        statement="""SELECT * FROM users
                     WHERE school=%s 
                     AND (username=%s
                     OR email=%s)
                     LIMIT 1"""

        self.cursor.execute(statement,(school,username,username))
        records = self.cursor.fetchall()

        hashed=records[0][1]
        hashed.replace('$2y$', '$2a$')
        if bcrypt.checkpw(password.encode(),hashed.encode()):
            return records
    
    def addClient(self,username,client,schoolID):


        self.schools[schoolID]['clients'][client]={}
        self.schools[schoolID]['clients'][client]['username']=username

        chatrooms=self.schools[schoolID]['chatrooms']
        
        userlist=self.getOnlineUsers(schoolID)
        offline=self.getOfflineUsers(userlist,schoolID)
        userlist={'online':userlist,'offline':offline}
        
        welcome={'userList':userlist,'roomList':chatrooms,'type':'room+users'}
        
        self.sendPackage(client,[welcome])

        otherClients=[i for i in self.schools[schoolID]['clients'].keys() if i != client]
        justUsers={'userList':userlist,'type':'userList'}
        
        for i in otherClients:
            self.sendPackage(i,[justUsers])

    def addSchool(self,schoolID):
        chatrooms=self.getChatrooms(schoolID)
        self.schools[schoolID]={}
        self.schools[schoolID]['clients']={}
        self.schools[schoolID]['chatrooms']=chatrooms

    def getOfflineUsers(self,onlineUsers,schoolID):
        
        statement="SELECT username FROM users WHERE school=%s"
        self.cursor.execute(statement,(schoolID,))
        records = self.cursor.fetchall()
        if records:
            return [i[0] for i in records if i[0] not in onlineUsers]
    
    def getOnlineUsers(self,schoolID):
        x=list((self.schools[schoolID]['clients'].values()))
        userlist=([i['username'] for i in x])
        
        return userlist

    def getChatroomID(self,school,name):
        statement="SELECT id FROM chatrooms WHERE school=%s AND name=%s LIMIT 1"
        self.cursor.execute(statement,(school,name))
        records = self.cursor.fetchall()
        return records[0][0]

    def getChatroomName(self,school,id):
        statement="SELECT name FROM chatrooms WHERE school=%s AND id=%s LIMIT 1"
        self.cursor.execute(statement,(school,id))
        records = self.cursor.fetchall()
        return records[0][0]

    def getMessages(self,school,chatroom):
        statement="SELECT * FROM messages WHERE school=%s and chatroom=%s"
        self.cursor.execute(statement,(school,chatroom))
        records = self.cursor.fetchall()

        things = [{'type':'message','message': row[0], 'sender': row[1],'chatroom':self.getChatroomName(school,row[3]),'datetime':str(row[4])} for row in records]
        return things

    def getChatrooms(self,school):

        statement="SELECT name FROM chatrooms WHERE school=%s"
        self.cursor.execute(statement,(school,))
        records = self.cursor.fetchall()
        if records:
            return [i[0] for i in records]

    def makeGroup(self,name,creator):

        statement="""INSERT into groups
            (name,creator)
            VALUES (%s,%s)"""

        self.cursor.execute(statement,(name,creator))
        self.db.commit()


        
s=server()

