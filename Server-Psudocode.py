import socket
from threading import Thread
import mysql.connector
import ast
import random
from Crypto.Cipher import AES
from Crypto.Protocol import HKDF
from Crypto.Hash import SHA512
import bcrypt
G=2
n <- 19734900040940404664644305615517238200212737175723279495859664156912668581028626844565624073416930176658640903580121503424187075146581792121169366619768962912386932913035391380374152854390654320238159350999950760196043670547034246552641205036156304454114742591861285315528651792639509005687918434719606041598759632146313746054686415079747239188388174259165477084624911519924254250193142157594028121418869456159224309692587572801705369036200731722831092555576381490521445478978824802735386346431892032437482199817068803449197481051775442393900111881542447488099020087307856765855565090642652903369470287423296353531069
buffer <- 16384
address <- ('0.0.0.0', 2002)
colWidth=20
hostname='127.0.0.1'
username='remote'
password <- 'remote'
database <- 'chat'
private=random.randint(1,n)
public=pow(G,private,n)
CLASS Server:
    FUNCTION __init__(self):
         schools=[]
         sock <- socket.socket()
         sock.bind(address)
         sock.listen(5)
         connectDB()
         allschools= getStatement('SELECT * FROM schools')
        for i in  allschools:
             schools.append(School(i[0],i[1]))
        ENDFOR
        OUTPUT 'Server running - waiting for connections'
                                        ENDFOR
        accept_thread <- Thread(target= acceptConnections) #Creates accept Thread
        accept_thread.start() #Starts Thread
    ENDFUNCTION

    FUNCTION acceptConnections(self):
        while True:
            sock= sock.accept()[0] #accepts connection
            copy <- socket.dup(sock.fileno()) #Duplicates socket object
            client=Thread(target=Client,args=(self,sock.family, sock.type, sock.proto,),kwargs={'fileno':copy}) #Creates a Thread
            client.daemon=True #Sets the thread as a daemon Thread
            client.start() #Starts the thread
            sock.close() #Closes the original sock object
    ENDFUNCTION

        ENDWHILE
    FUNCTION insertStatement(self,statement,*args):
         cursor.execute(statement,(args))
         db.commit()
    ENDFUNCTION

    FUNCTION getStatement(self,statement,*args):
         cursor.execute(statement,(args))
        records= cursor.fetchall()
        RETURN records
    ENDFUNCTION

    FUNCTION connectDB(self):
         db <- mysql.connector.connect(host=hostname, user=username, passwd=password, db=database, port=3306)
         cursor <-  db.cursor()
    ENDFUNCTION

ENDCLASS

CLASS Client(socket.socket):
    FUNCTION __init__(self,parent,*args, **kwargs):
        super(Client, self).__init__(*args, **kwargs)
         parent=parent
         encryptChannel()
        address=':'.join(str(i) for i in  getpeername())
                                ENDFOR
        OUTPUT 'Connection from',address
         schoolID, username,password= recieveX()[0].split(',')
         username= username.title()
         schoolName= parent.getStatement('SELECT name FROM schools WHERE id=%s', schoolID)
        IF  schoolName:
             schoolName= schoolName[0][0]
            status= checkDetails( schoolID, username,password)
            IF status:
                 sendX(['Logged In'])
                 school <- [i for i in  parent.schools IF i.ID== schoolID][0]
                                                              ENDIF
                                 ENDFOR
                 school.clients.append(self)
                userList= getUserList()
                 makeChatrooms()
                welcome={'userList':userList,'roomList':[i[0] for i in  chatrooms],'type':'room+users'}
                                                              ENDFOR
                justUsers={'userList':userList,'type':'userList'}
                others=[i for i in  school.clients IF i!=self]
                                                       ENDIF
                          ENDFOR
                for i in others:
                    i.sendX([justUsers])
                ENDFOR
                 sendX([welcome])
                 messageLoop()
            ELSE:
                 sendX(['Incorrect details'])
                status=0
                 close()
            ENDIF
        ELSE:
            status=0
             schoolName='badSchool'
             sendX(['School not found'])
             close()
        ENDIF
         parent.insertStatement("""INSERT into connections
        (status,address,schoolID,schoolName,username)
         VALUES (%s,%s,%s,%s,%s)""",status,address, schoolID, schoolName, username)
    ENDFUNCTION

    FUNCTION getUserList(self):
        online=[i.username for i in  school.clients]
                           ENDFOR
        allUsers= parent.getStatement("SELECT username FROM users WHERE school=%s", school.ID)
        offline=[i[0] for i in allUsers IF i[0] not in online]
                                        ENDIF
                      ENDFOR
        userList={'online':online,'offline':offline}
        RETURN userList
    ENDFUNCTION

    FUNCTION makeChatrooms(self):
         chatrooms=[[i[0],i[2]] for i in  parent.getStatement("SELECT * FROM chatrooms WHERE school=%s", school.ID)]
                                    ENDFOR
        for i in  chatrooms:
             school.chatrooms.append(Chatroom(i[0],i[1]))
    ENDFUNCTION

        ENDFOR
    FUNCTION messageLoop(self):
        while True:
            msgList <-  recieveX()
            for message in msgList:
                package=ast.literal_eval(message)
                IF package['type']=='message':
                     message(package)  
                ENDIF
                IF package['type']=='fetch':
                     fetch(package)    
                ENDIF
                IF package['type']=='dmMessage':
                     dmMessage(package)
                ENDIF
                IF package['type']=='quit':
                     school.clients.remove(self)
                    userList= getUserList()
                    justUsers={'userList':userList,'type':'userList'}
                    others=[i for i in  school.clients]
                              ENDFOR
                    for i in others:
                        i.sendX([justUsers])
                    ENDFOR
                     close()
                    RETURN
                ENDIF
    ENDFUNCTION

        ENDWHILE
            ENDFOR
    FUNCTION message(self,package):
        message=package['message']
        chatroom=package['chatroom']
        chatroom= parent.getStatement("SELECT id FROM chatrooms WHERE name=%s AND school=%s",chatroom, schoolID)[0][0]
        sender=package['sender']
        OUTPUT message,sender, schoolID,chatroom
         parent.insertStatement("""INSERT into messages
                    (message,sender,school,chatroom,display)
                    VALUES (%s,%s,%s,%s,1)""",message,sender, schoolID,chatroom)
        for i in  school.clients:
            i.sendX([package])
    ENDFUNCTION

        ENDFOR
    FUNCTION dmMessage(self,package):
        for i in  school.clients:
            IF i.username in [package['from'],package['to']]:
                i.sendX([package])
            ENDIF
    ENDFUNCTION

        ENDFOR
    FUNCTION fetch(self,package):
        IF package['param']=='dm':
            requester=package['requester']
            asoc=package['asoc']
            x= parent.getStatement("""SELECT * FROM dms WHERE school=%s AND 
                        (xFrom=%s AND xTo=%s) OR 
                        (xFrom=%s AND xTo=%s)""",
                         school.ID,requester,asoc,asoc,requester)
            dms <- [{'type':'dmMessage','message': row[0], 'from': row[1],'to':row[2],'datetime':str(row[4])} for row in x]
                                                                                                             ENDFOR
            for i in  school.clients:
                IF i.username==requester:
                    i.sendX(dms)
        ENDIF
                ENDIF
            ENDFOR
        IF package['param']=='chatroom':
            chatroom=package['chatroom']
            id=[i.ID for i in  school.chatrooms IF i.name==chatroom][0]
                                                    ENDIF
                     ENDFOR
            msgs= parent.getStatement('SELECT * FROM messages where school=%s AND chatroom=%s', school.ID,id)
            things <- [{'type':'message','message': row[0], 'sender': row[1],'chatroom':chatroom,'datetime':str(row[4])} for row in msgs]
                                                                                                                        ENDFOR
             sendX(things)
        ENDIF
    ENDFUNCTION

    FUNCTION checkDetails(self,school,username,password):
        match <- SUBROUTINE FindUserMatches
        IF match:
            correctPassword <- SUBROUTINE checkPW(password,match)
            IF correctPassword: RETURN 1
            ELSE: RETURN 0
        ENDIF
            ENDIF
    ENDFUNCTION

    FUNCTION diffieHelman:
         SUBROUTINE sendMyPublic
         SUBROUTINE recieveTheirPublic
         key <- (theirPublic**myPrivate)%n
         commKey <- keyDerivationFunction(key)
         cipher <- makeCipher(commKey)
    ENDFUNCTION

                                                                                  ENDFOR
    FUNCTION sendMessages(messages):
        for message in messages:
            message <- cipherEncrypt(message)

            IF messageIsLastMessage:
                message <- message+'END'
            ELSE:
                message <- message+'/7/4534'
            ENDIF
            send(message.encode())
    ENDFUNCTION

        ENDFOR
FUNCTION recieveX():

    string <- ''
    while forever:
        msg= SUBROUTINE recieveMessage
        string <- string+msg
        IF string[-3:]=='END':
            break
        ENDIF
    ENDWHILE

    x <- string[:-3]
    for message in x:
        message <- removeCharacters(message,'/7/4534')
        c <- []
        decrypted <- SUBROUTINE Decrypt(message)
        c.append(decrypted)
    ENDFOR
    return c
ENDFUNCTION

ENDCLASS

CLASS Cipher():
    FUNCTION __init__(self,key):
         obj=AES.new(key,AES.MODE_ECB) #Creates a new AES object using the Key
    ENDFUNCTION

    FUNCTION pad(self,s):
        RETURN s + ((16-len(s) % 16) * '`')  #Pads message in order to make sure it fits the correct length for AES
    ENDFUNCTION

                                                                                                            ENDFOR
FUNCTION encrypt(message):
    message <- SUBROUTINE pad(message)
    encrypted= cipher.encrypt(message) 
    hexed=SUBROUTINE toHex(encrypted)
    RETURN hexed 
ENDFUNCTION

    FUNCTION decrypt(ciphertext):
        dec <-  cipher.decrypt(ciphertext)
        dec <- SUBROUTINE toUTF8(dec)
        l <- SUBROUTINE countChars(dec,'`')
        RETURN dec[:len(dec)-l]
    ENDFUNCTION

ENDCLASS

CLASS School:
    FUNCTION __init__(self,schoolName,schoolID):
         name=schoolName
         ID=schoolID
         clients=[]
         chatrooms=[]
    ENDFUNCTION

ENDCLASS

CLASS Chatroom:
    FUNCTION __init__(self,name,ID):
         name=name
         ID=ID
    ENDFUNCTION

ENDCLASS

Server()
