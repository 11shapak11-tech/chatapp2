// App.js
// نقطة الدخول الرئيسية للتطبيق - يحدد نظام التنقل بين الشاشات

import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebaseConfig';

import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import ChatListScreen from './screens/ChatListScreen';
import ChatScreen from './screens/ChatScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // الاستماع لتغييرات حالة تسجيل الدخول
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return null; // ممكن نضيف شاشة تحميل هنا لاحقًا
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {user ? (
          // المستخدم مسجل دخول: يدخل على شاشات المحادثة
          <>
            <Stack.Screen
              name="ChatList"
              component={ChatListScreen}
              options={{ title: 'المحادثات' }}
            />
            <Stack.Screen
              name="Chat"
              component={ChatScreen}
              options={({ route }) => ({ title: route.params?.chatName || 'محادثة' })}
            />
          </>
        ) : (
          // المستخدم غير مسجل: يدخل على شاشات تسجيل الدخول
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ title: 'تسجيل الدخول' }}
            />
            <Stack.Screen
              name="Signup"
              component={SignupScreen}
              options={{ title: 'حساب جديد' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
