// screens/ChatScreen.js
// شاشة محادثة واحدة - عرض وإرسال الرسائل في الوقت الفعلي

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

export default function ChatScreen({ route }) {
  const { chatId } = route.params;
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const flatListRef = useRef(null);

  const currentUser = auth.currentUser;

  useEffect(() => {
    // الاستماع للرسائل في هذي المحادثة بالوقت الفعلي
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setMessages(msgs);

      // التمرير لآخر رسالة
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    return unsubscribe;
  }, [chatId]);

  const sendMessage = async () => {
    if (!text.trim()) return;

    const messageText = text.trim();
    setText('');

    try {
      // إضافة الرسالة لقائمة الرسائل
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        text: messageText,
        senderId: currentUser.uid,
        createdAt: serverTimestamp(),
      });

      // تحديث آخر رسالة في المحادثة (يظهر في قائمة المحادثات)
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: messageText,
        lastMessageAt: serverTimestamp(),
      });
    } catch (error) {
      // في حال فشل الإرسال نرجع النص للمستخدم
      setText(messageText);
    }
  };

  const renderMessage = ({ item }) => {
    const isMine = item.senderId === currentUser.uid;
    return (
      <View
        style={[
          styles.messageBubble,
          isMine ? styles.myMessage : styles.theirMessage,
        ]}
      >
        <Text style={isMine ? styles.myMessageText : styles.theirMessageText}>
          {item.text}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
      />

      <View style={styles.inputRow}>
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendButtonText}>إرسال</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="اكتب رسالة..."
          value={text}
          onChangeText={setText}
          multiline
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  messagesList: {
    padding: 12,
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginVertical: 4,
  },
  myMessage: {
    backgroundColor: '#2563eb',
    alignSelf: 'flex-start',
  },
  theirMessage: {
    backgroundColor: '#fff',
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderColor: '#eee',
  },
  myMessageText: {
    color: '#fff',
    fontSize: 15,
    textAlign: 'right',
  },
  theirMessageText: {
    color: '#000',
    fontSize: 15,
    textAlign: 'right',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    maxHeight: 100,
    textAlign: 'right',
  },
  sendButton: {
    backgroundColor: '#2563eb',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
