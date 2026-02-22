/**
 * Messenger Screen - Real-time chat between Drivers and Admin
 * Driver: auto-opens their conversation (conv_{driverId})
 * Admin: lists all conversations, then opens selected one
 * Uses same RTDB paths as web: conversations/, messages/
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
    SafeAreaView, StatusBar,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { rtdb, dbRef, dbPush, dbSet, onValue } from '../../src/services/firebase';

interface Message {
    id: string;
    text: string;
    senderUid: string;
    senderName: string;
    senderRole: string;
    timestamp: number;
}

interface Conversation {
    id: string;
    chauffeurName: string;
    lastMessage: string;
    lastMessageAt: number;
    lastSenderName?: string;
}

export default function MessengerScreen() {
    const { user } = useAuth();
    const isDriver = !!user?.driverId;
    const isAdmin = user?.role === 'super_admin' || user?.roleId === 'super_admin';

    const [loading, setLoading] = useState(true);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [currentConvId, setCurrentConvId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const flatListRef = useRef<FlatList>(null);

    // ─── Load conversations (admin) or auto-open (driver) ───
    useEffect(() => {
        if (!user) return;

        if (isDriver && user.driverId) {
            // Driver: auto-open their conversation
            const convId = `conv_${user.driverId}`;
            setCurrentConvId(convId);

            // Ensure conversation exists
            const convRef = dbRef(rtdb, `conversations/${convId}`);
            onValue(convRef, (snapshot) => {
                if (!snapshot.exists()) {
                    dbSet(convRef, {
                        chauffeurName: user.displayName || user.email,
                        chauffeurUid: user.uid,
                        lastMessage: '',
                        lastMessageAt: Date.now(),
                    });
                }
            }, { onlyOnce: true });
            setLoading(false);
        } else if (isAdmin) {
            // Admin: load all conversations
            const convsRef = dbRef(rtdb, 'conversations');
            const unsub = onValue(convsRef, (snapshot) => {
                const data = snapshot.val();
                if (!data) {
                    setConversations([]);
                    setLoading(false);
                    return;
                }
                const list: Conversation[] = Object.entries(data).map(([id, val]: any) => ({
                    id,
                    chauffeurName: val.chauffeurName || 'Chauffeur',
                    lastMessage: val.lastMessage || '',
                    lastMessageAt: val.lastMessageAt || 0,
                    lastSenderName: val.lastSenderName,
                }));
                list.sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));
                setConversations(list);
                setLoading(false);
            });
            return () => unsub();
        } else {
            setLoading(false);
        }
    }, [user]);

    // ─── Listen to messages for current conversation ───
    useEffect(() => {
        if (!currentConvId) {
            setMessages([]);
            return;
        }
        const msgsRef = dbRef(rtdb, `messages/${currentConvId}`);
        const unsub = onValue(msgsRef, (snapshot) => {
            const data = snapshot.val();
            if (!data) {
                setMessages([]);
                return;
            }
            const list: Message[] = Object.entries(data).map(([id, val]: any) => ({
                id,
                text: val.text || '',
                senderUid: val.senderUid || '',
                senderName: val.senderName || '',
                senderRole: val.senderRole || '',
                timestamp: val.timestamp || 0,
            }));
            list.sort((a, b) => a.timestamp - b.timestamp);
            setMessages(list);
        });
        return () => unsub();
    }, [currentConvId]);

    // Scroll to bottom when messages change
    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
    }, [messages.length]);

    // ─── Send message ───
    const handleSend = async () => {
        const text = inputText.trim();
        if (!text || !currentConvId || !user) return;

        setInputText('');

        const msgData = {
            text,
            senderUid: user.uid,
            senderName: user.displayName || user.email,
            senderRole: user.role || 'user',
            timestamp: Date.now(),
        };

        try {
            const msgsRef = dbRef(rtdb, `messages/${currentConvId}`);
            await dbPush(msgsRef, msgData);

            // Update conversation metadata
            const convRef = dbRef(rtdb, `conversations/${currentConvId}`);
            await dbSet(convRef, {
                chauffeurName: isDriver
                    ? (user.displayName || user.email)
                    : (conversations.find(c => c.id === currentConvId)?.chauffeurName || 'Chauffeur'),
                lastMessage: text.substring(0, 50),
                lastMessageAt: Date.now(),
                lastSenderName: user.displayName || user.email,
            });
        } catch (err) {
            console.error('Error sending message:', err);
        }
    };

    // ─── Format time ───
    const formatTime = (timestamp: number) => {
        if (!timestamp) return '';
        const d = new Date(timestamp);
        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();
        if (isToday) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) + ' ' +
            d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    };

    // ─── Render a single message bubble ───
    const renderMessage = ({ item }: { item: Message }) => {
        const isMine = item.senderUid === user?.uid;
        return (
            <View style={[styles.msgRow, isMine ? styles.msgRowRight : styles.msgRowLeft]}>
                <View style={[styles.msgBubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
                    {!isMine && (
                        <Text style={styles.senderName}>{item.senderName}</Text>
                    )}
                    <Text style={styles.msgText}>{item.text}</Text>
                    <Text style={[styles.msgTime, isMine && styles.msgTimeMine]}>
                        {formatTime(item.timestamp)}
                    </Text>
                </View>
            </View>
        );
    };

    // ─── Render conversation list (admin) ───
    const renderConversation = ({ item }: { item: Conversation }) => {
        const isActive = currentConvId === item.id;
        return (
            <TouchableOpacity
                style={[styles.convItem, isActive && styles.convItemActive]}
                onPress={() => setCurrentConvId(item.id)}
            >
                <View style={styles.convAvatar}>
                    <MaterialCommunityIcons name="account" size={24} color="#8b5cf6" />
                </View>
                <View style={styles.convInfo}>
                    <Text style={styles.convName}>{item.chauffeurName}</Text>
                    <Text style={styles.convLastMsg} numberOfLines={1}>
                        {item.lastSenderName ? `${item.lastSenderName}: ` : ''}{item.lastMessage || 'Aucun message'}
                    </Text>
                </View>
                <Text style={styles.convTime}>{formatTime(item.lastMessageAt)}</Text>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    // ─── Admin: conversation list + chat ───
    if (isAdmin && !currentConvId) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>💬 Messenger</Text>
                    <Text style={styles.headerSubtitle}>{conversations.length} conversation(s)</Text>
                </View>
                {conversations.length === 0 ? (
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="chat-outline" size={64} color="#334155" />
                        <Text style={styles.emptyText}>Aucune conversation</Text>
                        <Text style={styles.emptySubtext}>Les chauffeurs pourront vous écrire ici</Text>
                    </View>
                ) : (
                    <FlatList
                        data={conversations}
                        keyExtractor={item => item.id}
                        renderItem={renderConversation}
                        contentContainerStyle={styles.convList}
                    />
                )}
            </SafeAreaView>
        );
    }

    // ─── Chat view (driver or selected conversation) ───
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={90}
            >
                {/* Chat Header */}
                <View style={styles.chatHeader}>
                    {isAdmin && (
                        <TouchableOpacity
                            onPress={() => setCurrentConvId(null)}
                            style={styles.backBtn}
                        >
                            <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text} />
                        </TouchableOpacity>
                    )}
                    <View style={styles.chatHeaderInfo}>
                        <Text style={styles.chatHeaderTitle}>
                            {isDriver ? '💬 Admin' : (
                                conversations.find(c => c.id === currentConvId)?.chauffeurName || 'Chat'
                            )}
                        </Text>
                        <Text style={styles.chatHeaderSub}>
                            {isDriver ? 'Envoyez un message à l\'administrateur' : 'Conversation avec le chauffeur'}
                        </Text>
                    </View>
                </View>

                {/* Messages */}
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={item => item.id}
                    renderItem={renderMessage}
                    contentContainerStyle={styles.msgList}
                    ListEmptyComponent={
                        <View style={styles.emptyChat}>
                            <MaterialCommunityIcons name="chat-processing-outline" size={48} color="#334155" />
                            <Text style={styles.emptyChatText}>Aucun message</Text>
                            <Text style={styles.emptyChatSub}>Commencez la conversation !</Text>
                        </View>
                    }
                />

                {/* Input Bar */}
                <View style={styles.inputBar}>
                    <TextInput
                        style={styles.input}
                        placeholder="Écrire un message..."
                        placeholderTextColor="#64748b"
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                        maxLength={500}
                    />
                    <TouchableOpacity
                        style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
                        onPress={handleSend}
                        disabled={!inputText.trim()}
                    >
                        <MaterialCommunityIcons
                            name="send"
                            size={20}
                            color={inputText.trim() ? '#fff' : '#475569'}
                        />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    center: { justifyContent: 'center', alignItems: 'center' },

    // Header
    header: { padding: Spacing.lg, paddingBottom: Spacing.sm },
    headerTitle: { fontSize: 28, fontWeight: '800', color: Colors.text },
    headerSubtitle: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 4 },

    // Conversation list
    convList: { paddingHorizontal: Spacing.md },
    convItem: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        padding: Spacing.md, marginBottom: Spacing.sm,
        ...Shadows.small,
    },
    convItemActive: {
        borderWidth: 1, borderColor: '#8b5cf6',
    },
    convAvatar: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: 'rgba(139,92,246,0.15)',
        justifyContent: 'center', alignItems: 'center',
        marginRight: Spacing.sm,
    },
    convInfo: { flex: 1 },
    convName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
    convLastMsg: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
    convTime: { fontSize: FontSize.xs, color: Colors.textMuted },

    // Empty state
    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 80 },
    emptyText: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textSecondary, marginTop: Spacing.md },
    emptySubtext: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 4 },

    // Chat header
    chatHeader: {
        flexDirection: 'row', alignItems: 'center',
        padding: Spacing.md,
        borderBottomWidth: 1, borderBottomColor: 'rgba(148,163,184,0.1)',
        backgroundColor: 'rgba(30,41,59,0.8)',
    },
    backBtn: { marginRight: Spacing.sm, padding: 4 },
    chatHeaderInfo: { flex: 1 },
    chatHeaderTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
    chatHeaderSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },

    // Messages
    msgList: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, flexGrow: 1 },
    msgRow: { marginBottom: 6 },
    msgRowRight: { alignItems: 'flex-end' },
    msgRowLeft: { alignItems: 'flex-start' },
    msgBubble: {
        maxWidth: '75%',
        paddingHorizontal: 14, paddingVertical: 10,
        borderRadius: 18,
    },
    bubbleMine: {
        backgroundColor: '#6366f1',
        borderBottomRightRadius: 4,
    },
    bubbleOther: {
        backgroundColor: 'rgba(51,65,85,0.7)',
        borderBottomLeftRadius: 4,
    },
    senderName: {
        fontSize: 11, fontWeight: '600', color: '#94a3b8', marginBottom: 2,
    },
    msgText: { fontSize: 14, color: '#f1f5f9', lineHeight: 20 },
    msgTime: { fontSize: 10, color: '#64748b', textAlign: 'right', marginTop: 4 },
    msgTimeMine: { color: 'rgba(255,255,255,0.5)' },

    // Empty chat
    emptyChat: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
    emptyChatText: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textSecondary, marginTop: Spacing.sm },
    emptyChatSub: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 4 },

    // Input bar
    inputBar: {
        flexDirection: 'row', alignItems: 'flex-end',
        paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
        borderTopWidth: 1, borderTopColor: 'rgba(148,163,184,0.1)',
        backgroundColor: 'rgba(15,23,42,0.95)',
    },
    input: {
        flex: 1,
        backgroundColor: 'rgba(51,65,85,0.5)',
        borderRadius: 20,
        paddingHorizontal: 16, paddingVertical: 10,
        fontSize: 14, color: Colors.text,
        maxHeight: 100,
        marginRight: Spacing.sm,
    },
    sendBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#6366f1',
        justifyContent: 'center', alignItems: 'center',
    },
    sendBtnDisabled: { backgroundColor: 'rgba(51,65,85,0.5)' },
});
