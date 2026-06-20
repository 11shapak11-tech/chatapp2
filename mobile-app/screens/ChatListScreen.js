// screens/ChatListScreen.js
// شاشة قائمة المحادثات - تعرض كل المحادثات الخاصة بالمستخدم

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  addDoc,
  serverTimestamp,
  getDocs,
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';

export default function ChatListScreen({ navigation }) {
  const [chats, setChats] = useState([]);
  const [searchEmail, setSearchEmail] = useState('');

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    // الاستماع للمحادثات اللي المستخدم الحالي عضو فيها
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', currentUser.uid),
      orderBy('lastMessageAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setChats(chatList);
    });

    return unsubscribe;
  }, []);

  const handleLogout = () => {
    signOut(auth);
  };

  const startNewChat = async () => {
    if (!searchEmail.trim()) {
      Alert.alert('خطأ', 'أدخل البريد الإلكتروني للشخص الذي تريد محادثته');
      return;
    }

    try {
      // البحث عن المستخدم بالبريد الإلكتروني
      const usersQuery = query(
        collection(db, 'users'),
        where('email', '==', searchEmail.trim())
      );
      const usersSnapshot = await getDocs(usersQuery);

      if (usersSnapshot.empty) {
        Alert.alert('غير موجود', 'لا يوجد مستخدم بهذا البريد الإلكتروني');
        return;
      }

      const otherUser = usersSnapshot.docs[0];
      const otherUserId = otherUser.id;
      const otherUserData = otherUser.data();
      const currentUser = auth.currentUser;

      if (otherUserId === currentUser.uid) {
        Alert.alert('خطأ', 'لا يمكنك بدء محادثة مع نفسك');
        return;
      }

      // إنشاء محادثة جديدة
      const newChat = await addDoc(collection(db, 'chats'), {
        participants: [currentUser.uid, otherUserId],
        participantNames: {
          [currentUser.uid]: currentUser.displayName || 'مستخدم',
          [otherUserId]: otherUserData.name || 'مستخدم',
        },
        lastMessage: '',
        lastMessageAt: serverTimestamp(),
      });

      setSearchEmail('');
      navigation.navigate('Chat', {
        chatId: newChat.id,
        chatName: otherUserData.name,
      });
    } catch (error) {
      Alert.alert('خطأ', 'حدث خطأ أثناء بدء المحادثة');
    }
  };

  const renderChatItem = ({ item }) => {
    const currentUser = auth.currentUser;
    const otherUserId = item.participants.find((id) => id !== currentUser.uid);
    const otherUserName = item.participantNames?.[otherUserId] || 'مستخدم';

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() =>
          navigation.navigate('Chat', { chatId: item.id, chatName: otherUserName })
        }
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{otherUserName.charAt(0)}</Text>
        </View>
        <View style={styles.chatInfo}>
          <Text style={styles.chatName}>{otherUserName}</Text>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage || 'لا توجد رسائل بعد'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.newChatRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="بريد إلكتروني لبدء محادثة جديدة"
          value={searchEmail}
          onChangeText={setSearchEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TouchableOpacity style={styles.newChatButton} onPress={startNewChat}>
          <Text style={styles.newChatButtonText}>بدء</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={renderChatItem}
        ListEmptyComponent={
          <Text style={styles.emptyText}>لا توجد محادثات حتى الآن</Text>
        }
      />

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>تسجيل الخروج</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  newChatRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    textAlign: 'right',
  },
  newChatButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  newChatButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  chatItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  chatInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
  },
  lastMessage: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 40,
    fontSize: 15,
  },
  logoutButton: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  logoutText: {
    color: '#e11d48',
    fontWeight: '600',
  },
});
