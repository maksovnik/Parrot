import socket
from threading import Thread
import mysql.connector
import ast
import random
from Crypto.Cipher import AES
from Crypto.Protocol import HKDF
from Crypto.Hash import SHA512
import datetime
import bcrypt

G=2
n = 19734900040940404664644305615517238200212737175723279495859664156912668581028626844565624073416930176658640903580121503424187075146581792121169366619768962912386932913035391380374152854390654320238159350999950760196043670547034246552641205036156304454114742591861285315528651792639509005687918434719606041598759632146313746054686415079747239188388174259165477084624911519924254250193142157594028121418869456159224309692587572801705369036200731722831092555576381490521445478978824802735386346431892032437482199817068803449197481051775442393900111881542447488099020087307856765855565090642652903369470287423296353531069
buffer = 16384
address = ('0.0.0.0', 2002)
colWidth=20

hostname='127.0.0.1'
username='remote'
password = 'remote'
database = 'chat'

private=random.randint(1,n)
public=pow(G,private,n)

class Server:
    def __init__(self):
        self.schools=[]
        self.sock = socket.socket()
        self.sock.bind(address)
        self.sock.listen(5)

        
        self.connectDB()

        self.allschools=self.getStatement('SELECT * FROM schools')

        for i in self.allschools:
            self.schools.append(School(i[0],i[1]))

        print('PARROT Server running - waiting for connections')
        self.printRow(['Status','IP','SchoolID','Username','Datetime','Encrypted?'])
        accept_thread = Thread(target=self.acceptConnections) #Creates accept Thread
        accept_thread.start() #Starts Thread

    def acceptConnections(self):
        while True:
            sock=self.sock.accept()[0] #accepts connection
            copy = socket.dup(sock.fileno()) #Duplicates socket object
            client=Thread(target=Client,args=(self,sock.family, sock.type, sock.proto,),kwargs={'fileno':copy}) #Creates a Thread
            client.daemon=True #Sets the thread as a daemon Thread
            client.start() #Starts the thread
            sock.close() #Closes the original sock object

    def insertStatement(self,statement,*args):
        self.cursor.execute(statement,(args))
        self.db.commit()

    def getStatement(self,statement,*args):
        self.cursor.execute(statement,(args))
        records=self.cursor.fetchall()
        return records

    def printRow(self,info):
        print('|'.join(('%*s' % (20, i) for i in info)))

    def connectDB(self):
        self.db = mysql.connector.connect(host=hostname, user=username, passwd=password, db=database, port=3306)
        self.cursor = self.db.cursor()
        
class Client(socket.socket):
    def __init__(self,parent,*args, **kwargs):
        super(Client, self).__init__(*args, **kwargs)
        self.parent=parent
        self.encryptChannel()
        address=':'.join(str(i) for i in self.getpeername())
        self.address=address

        self.schoolID,self.username,password=self.recieveX()[0].split(',')
        self.username=self.username.title()
        
        self.schoolName=self.parent.getStatement('SELECT name FROM schools WHERE id=%s',self.schoolID)

        if self.schoolName:
            self.schoolName=self.schoolName[0][0]
            status=self.checkDetails(self.schoolID,self.username,password)

            sd={1:'Success',0:'Failed',None:'Failed'}
            info=[sd[status],self.address,self.schoolID,self.username,str(datetime.datetime.now())[:-7],'Yes']
            self.parent.printRow(info)

            if status:
                self.sendX(['Logged In'])
                self.school = [i for i in self.parent.schools if i.ID==self.schoolID][0]
                self.school.clients.append(self)

                userList=self.getUserList()

                self.makeChatrooms()
                
                welcome={'userList':userList,'roomList':[i[0] for i in self.chatrooms],'type':'room+users'}
                justUsers={'userList':userList,'type':'userList'}

                others=[i for i in self.school.clients if i!=self]
                for i in others:
                    i.sendX([justUsers])

                self.sendX([welcome])
                self.messageLoop()

            else:
                self.sendX(['Incorrect details'])
                status=0
                self.close()
            
        else:
            status=0
            self.schoolName='badSchool'

            self.sendX(['School not found'])
            self.close()

        self.parent.insertStatement("""INSERT into connections
        (status,address,schoolID,schoolName,username)
         VALUES (%s,%s,%s,%s,%s)""",status,address,self.schoolID,self.schoolName,self.username)
        
    def getUserList(self):
        online=[i.username for i in self.school.clients]
        allUsers=self.parent.getStatement("SELECT username FROM users WHERE school=%s",self.school.ID)
        offline=[i[0] for i in allUsers if i[0] not in online]
        userList={'online':online,'offline':offline}
        return userList

    def makeChatrooms(self):
        self.chatrooms=[[i[0],i[2]] for i in self.parent.getStatement("SELECT * FROM chatrooms WHERE school=%s",self.school.ID)]
        for i in self.chatrooms:
            self.school.chatrooms.append(Chatroom(i[0],i[1]))

    def messageLoop(self):
        while True:
            msgList = self.recieveX()
            for message in msgList:
              
                package=ast.literal_eval(message)
                if package['type']=='message':
                    self.message(package)  
                if package['type']=='fetch':
                    self.fetch(package)    
                if package['type']=='dmMessage':
                    self.dmMessage(package)
                if package['type']=='quit':
                    self.school.clients.remove(self)
                    userList=self.getUserList()
                    justUsers={'userList':userList,'type':'userList'}
                    others=[i for i in self.school.clients]

                    info=['Disconnected',self.address,self.schoolID,self.username,str(datetime.datetime.now())[:-7],'Yes']
                    self.parent.printRow(info)

                    for i in others:
                        i.sendX([justUsers])
                    self.close()
                    return

                if package['type']=='newGroup':
                    existing = self.parent.getStatement('SELECT * from chatrooms WHERE name=%s',package['name'].title())
                    if not existing:
                        self.parent.insertStatement('INSERT into chatrooms (name,school) VALUES (%s,%s)',package['name'].title(),self.schoolID)
                        self.chatrooms=[]
                        self.makeChatrooms()
                        x={'roomList':[i[0] for i in self.chatrooms],'type':'roomList'}
                        for i in self.school.clients:
                            i.sendX([x])


    def message(self,package):
        message=package['message']
        chatroom=package['chatroom']
        chatroom=self.parent.getStatement("SELECT id FROM chatrooms WHERE name=%s and school=%s",chatroom,self.schoolID)[0][0]
        
        sender=package['sender']
        self.parent.insertStatement("""INSERT into messages
                    (message,sender,school,chatroom,display)
                    VALUES (%s,%s,%s,%s,1)""",message,sender,self.schoolID,chatroom)
        
        for i in self.school.clients:
            i.sendX([package])
        
    def dmMessage(self,package):
        for i in self.school.clients:
            if i.username in [package['from'],package['to']]:
                i.sendX([package])

    def fetch(self,package):

        if package['param']=='dm':
            requester=package['requester']
            asoc=package['asoc']
            x=self.parent.getStatement("""SELECT * FROM dms WHERE school=%s and 
                        (xFrom=%s and xTo=%s) OR 
                        (xFrom=%s and xTo=%s)""",
                        self.school.ID,requester,asoc,asoc,requester)
            dms = [{'type':'dmMessage','message': row[0], 'from': row[1],'to':row[2],'datetime':str(row[4])} for row in x]
            for i in self.school.clients:
                if i.username==requester:

                    i.sendX(dms)

        if package['param']=='chatroom':
            chatroom=package['chatroom']
            id=[i.ID for i in self.school.chatrooms if i.name==chatroom]
            if id:
                id=id[0]
                msgs=self.parent.getStatement('SELECT * FROM messages where school=%s and chatroom=%s',self.school.ID,id)
                things = [{'type':'message','message': row[0], 'sender': row[1],'chatroom':chatroom,'datetime':str(row[4])} for row in msgs]
                self.sendX(things)
            
    def checkDetails(self,school,username,password):

        matches=self.parent.getStatement('''SELECT password FROM users
                            WHERE school=%s
                            AND (username=%s
                            OR email=%s)
                            LIMIT 1''', school,username,username)
        if matches:
            hashed=matches[0][0]
            hashed.replace('$2y$', '$2a$')
            if bcrypt.checkpw(password.encode(),hashed.encode()): return 1
            else: return 0
                
    def encryptChannel(self):
        
        self.sendX([public],encrypt=False) #Send's the server's public key to the client
        self.public=int(self.recieveX(encrypted=False)[0]) #Recieves the clients public key

        key=pow(self.public,private,n) #Performs modulo arithmetic to obtain a shared key
        commKey = HKDF(str(key).encode(), 32, None, SHA512, 1) #Uses Key Derivation Function to generate key suitable for AES
        self.cipher=Cipher(commKey) #Creates a Cipher from the final key suitable for use with AES

    def sendX(self,msgs,encrypt=True):

        for i in range(len(msgs)):
            message=str(msgs[i])
            
            if encrypt:
                message=self.cipher.encryptX(message)
            if i==len(msgs)-1:
                message=message+'END'
            else:
                message=message+'/7/4534'
                
            self.send(message.encode())

    def recieveX(self,encrypted=True):
        
        string=''

        while True:
            msg=self.recv(buffer).decode()
            string+=msg
            if string[-3:]=='END':
                break

        x = string[:-3]
        x=x.split('/7/4534')
        x=[i.split('END') for i in x ]
        x=sum(x, [])

        if encrypted:
            x=[self.cipher.decryptX(i) for i in x]
        
        return x

class Cipher():
    def __init__(self,key):
        self.obj=AES.new(key,AES.MODE_ECB) #Creates a new AES object using the Key

    def pad(self,s):
        return s + ((16-len(s) % 16) * '`')  #Pads message in order to make sure it fits the correct length for AES

    def encryptX(self,msg):
        encrypted=self.obj.encrypt(self.pad(msg).encode()).hex() #Encrypts message
        return encrypted #Returns encrypted message

    def decryptX(self,ciphertext):
        ciphertext=bytes(bytearray.fromhex(ciphertext)) #Turns base 16 ciphertext into base 2
        dec = self.obj.decrypt(ciphertext) #Decrypts ciphertext
        dec=dec.decode('utf-8') #Converts decrypted message to UTF8
        l = dec.count('`') #Counts the number of padded characters added to the message in encrypted
        return dec[:len(dec)-l] #Returns the message without the padded characters

class School:
    def __init__(self,schoolName,schoolID):
        self.name=schoolName
        self.ID=schoolID
        self.clients=[]
        self.chatrooms=[]

class Chatroom:
    def __init__(self,name,ID):
        self.name=name
        self.ID=ID

Server()
