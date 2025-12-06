import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSearch } from 'wouter';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search as SearchIcon, Send, ArrowLeft, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { notifyNewMessage } from '@/lib/notificationService';
import type { Conversation, Message } from '@shared/schema';
import { formatDistanceToNow } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type TeacherProfile = {
  id: string;
  user_id: string;
  full_name: string;
  profile_photo_url: string | null;
} | null;

type SchoolProfile = {
  id: string;
  user_id: string;
  school_name: string;
  logo_url: string | null;
} | null;

type ConversationWithUsers = Conversation & {
  teacher: TeacherProfile;
  school: SchoolProfile;
  job?: { id: string; title: string; school_name: string } | null;
  messages: Message[];
};

export default function Messages() {
  const { toast } = useToast();
  const search = useSearch();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check for conversation ID in URL query params
  useEffect(() => {
    if (!search) return;
    const params = new URLSearchParams(search);
    const conversationId = params.get('conversation');
    if (conversationId) {
      setSelectedConversation(conversationId);
    }
  }, [search]);

  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const role = user?.user_metadata?.role as 'teacher' | 'school' | undefined;

  const {
    data: conversations,
    isLoading,
    error: conversationsError,
  } = useQuery<ConversationWithUsers[]>({
    queryKey: ['/api/conversations', user?.id, role],
    queryFn: async () => {
      if (!user?.id || !role) {
        throw new Error('User not loaded');
      }

      // Conversations table uses user_id directly, not profile IDs
      let query = supabase
        .from('conversations')
        .select(`
          id,
          teacher_id,
          school_id,
          job_id,
          last_message_at,
          created_at,
          messages(*),
          job:jobs(
            id,
            title,
            school_name
          )
        `)
        .order('last_message_at', { ascending: false });

      // Filter by user_id (conversations table uses user IDs)
      if (role === 'teacher') {
        query = query.eq('teacher_id', user.id);
      } else {
        query = query.eq('school_id', user.id);
      }

      const { data: conversationsData, error } = await query;

      if (error) {
        console.error('Error fetching conversations:', error);
        throw error;
      }

      if (!conversationsData || conversationsData.length === 0) {
        return [];
      }

      // Fetch teacher and school profiles separately
      const teacherIds = [...new Set(conversationsData.map(c => c.teacher_id))];
      const schoolIds = [...new Set(conversationsData.map(c => c.school_id))];

      const [teachersResult, schoolsResult] = await Promise.all([
        supabase
          .from('teachers')
          .select('id, user_id, full_name, profile_photo_url')
          .in('user_id', teacherIds),
        supabase
          .from('schools')
          .select('id, user_id, school_name, logo_url')
          .in('user_id', schoolIds),
      ]);

      const teachersMap = new Map(
        (teachersResult.data || []).map(t => [t.user_id, t])
      );
      const schoolsMap = new Map(
        (schoolsResult.data || []).map(s => [s.user_id, s])
      );

      // Transform the data to match ConversationWithUsers interface
      return conversationsData.map((conv: any) => ({
        ...conv,
        teacher: teachersMap.get(conv.teacher_id) || null,
        school: schoolsMap.get(conv.school_id) || null,
      })) as ConversationWithUsers[];
    },
    enabled: !!user?.id && !!role,
  });

  const selectedConv = conversations?.find((c) => c.id === selectedConversation);

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConversation || !messageText.trim() || !user?.id) return;

      const { error } = await supabase.from('messages').insert({
        conversation_id: selectedConversation,
        sender_id: user.id,
        content: messageText.trim(),
      });

      if (error) throw error;

      // Update conversation last_message_at
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', selectedConversation);

      // Notify recipient (non-blocking)
      try {
        const selectedConv = conversations?.find(c => c.id === selectedConversation);
        if (selectedConv) {
          const isTeacher = user.user_metadata?.role === 'teacher';
          const recipientId = isTeacher ? selectedConv.school_id : selectedConv.teacher_id;
          const senderName = isTeacher 
            ? (selectedConv.teacher?.full_name || 'A teacher')
            : (selectedConv.school?.full_name || 'A school');
          
          await notifyNewMessage(
            recipientId,
            selectedConversation,
            senderName
          );
        }
      } catch (notifError) {
        console.error('Error sending message notification:', notifError);
      }
    },
    onSuccess: () => {
      setMessageText('');
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to send message',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessageMutation.mutate();
  };

  // Real-time subscription for messages
  useEffect(() => {
    if (!selectedConversation || !user?.id) return;

    const channel = supabase
      .channel(`conversation:${selectedConversation}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation}`,
        },
        (payload) => {
          // Invalidate queries to refetch messages
          queryClient.invalidateQueries({ queryKey: ['/api/conversations', user.id] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `id=eq.${selectedConversation}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['/api/conversations', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation, user?.id]);

  // Mark messages as read when conversation is selected
  useEffect(() => {
    if (!selectedConversation || !user?.id) return;

    const unreadMessages = selectedConv?.messages?.filter(
      (msg) => !msg.is_read && msg.sender_id !== user.id
    );

    if (unreadMessages && unreadMessages.length > 0) {
      const messageIds = unreadMessages.map((msg) => msg.id);
      supabase
        .from('messages')
        .update({ is_read: true })
        .in('id', messageIds)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['/api/conversations', user.id] });
        });
    }
  }, [selectedConversation, selectedConv, user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConv?.messages]);

  const getOtherParty = (conv: ConversationWithUsers) => {
    if (role === 'teacher') {
      return {
        name: conv.school?.school_name || 'School',
        photo: conv.school?.logo_url || null,
        userId: conv.school?.user_id || null,
      };
    }

    return {
      name: conv.teacher?.full_name || 'Teacher',
      photo: conv.teacher?.profile_photo_url || null,
      userId: conv.teacher?.user_id || null,
    };
  };

  const filteredConversations = conversations?.filter((conv) => {
    const otherParty = getOtherParty(conv);
    return otherParty.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <p className="text-muted-foreground">Loading conversations...</p>
        </div>
      </AuthenticatedLayout>
    );
  }

  if (conversationsError) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center h-[calc(100vh-4rem)] px-4">
          <Alert variant="destructive" className="max-w-lg">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Failed to load conversations: {conversationsError.message}
            </AlertDescription>
          </Alert>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout showMobileNav>
      <div className="h-[calc(100vh-4rem)] md:h-[calc(100vh-4rem)] flex flex-col md:flex-row max-w-6xl mx-auto">
        {/* Conversations List */}
        <div
          className={`${
            selectedConversation ? 'hidden md:flex' : 'flex'
          } w-full md:w-96 flex-col border-r border-border bg-card`}
        >
          {/* Search */}
          <div className="p-4 border-b border-card-border">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 pl-10"
                data-testid="input-search-conversations"
              />
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations && filteredConversations.length > 0 ? (
              filteredConversations.map((conv) => {
                const otherParty = getOtherParty(conv);
                const lastMessage = conv.messages?.[conv.messages.length - 1];
                const unreadCount = conv.messages?.filter(
                  (msg) => !msg.is_read && msg.sender_id !== user?.id
                ).length || 0;

                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv.id)}
                    className={`w-full p-4 flex gap-3 hover-elevate border-b border-card-border text-left relative ${
                      selectedConversation === conv.id ? 'bg-muted' : ''
                    } ${unreadCount > 0 ? 'bg-primary/5' : ''}`}
                    data-testid={`conversation-${conv.id}`}
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={otherParty.photo || undefined} alt={otherParty.name} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {getInitials(otherParty.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-semibold truncate ${unreadCount > 0 ? 'text-foreground font-bold' : 'text-foreground'}`}>
                          {otherParty.name}
                        </span>
                        <div className="flex items-center gap-2">
                          {unreadCount > 0 && (
                            <span className="bg-primary text-primary-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                              {unreadCount}
                            </span>
                          )}
                        {lastMessage && (
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(lastMessage.sent_at), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                      </div>
                      {conv.job && (
                        <p className="text-xs text-muted-foreground truncate mb-1">
                          {conv.job.title}
                        </p>
                      )}
                      <p className={`text-sm truncate ${unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                        {lastMessage?.content || 'No messages yet'}
                      </p>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-8 text-center">
                <p className="text-muted-foreground">No conversations yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Messages Thread */}
        <div className={`${selectedConversation ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-background`}>
          {selectedConv ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-border">
                <div className="flex items-center gap-3 mb-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={() => setSelectedConversation(null)}
                    data-testid="button-back"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={getOtherParty(selectedConv).photo || undefined} alt={getOtherParty(selectedConv).name} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {getInitials(getOtherParty(selectedConv).name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h2 className="font-semibold text-foreground">
                      {getOtherParty(selectedConv).name}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {user?.user_metadata?.role === 'teacher' ? 'School' : 'Teacher'}
                    </p>
                  </div>
                </div>
                {selectedConv.job && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{selectedConv.job.title}</p>
                        <p className="text-xs text-muted-foreground">{selectedConv.job.school_name}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          window.location.href = `/school/dashboard#applications`;
                        }}
                        className="h-8 text-xs"
                      >
                        View Application
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedConv.messages?.length > 0 ? (
                  selectedConv.messages
                    .sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime())
                    .map((message) => {
                      const isSent = message.sender_id === user?.id;
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs md:max-w-md rounded-lg p-3 ${
                              isSent
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-foreground'
                            }`}
                            data-testid={`message-${message.id}`}
                          >
                            <p className="text-sm whitespace-pre-line">{message.content}</p>
                            <p
                              className={`text-xs mt-1 ${
                                isSent ? 'text-primary-foreground/70' : 'text-muted-foreground'
                              }`}
                            >
                              {formatDistanceToNow(new Date(message.sent_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form
                onSubmit={handleSendMessage}
                className="p-4 border-t border-border flex gap-2"
              >
                <Input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 h-12"
                  data-testid="input-message"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!messageText.trim() || sendMessageMutation.isPending}
                  className="h-12 w-12"
                  data-testid="button-send"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <p>Select a conversation to start messaging</p>
            </div>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
