import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, Send, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Conversation, Message, User } from '@shared/schema';
import { formatDistanceToNow } from 'date-fns';

type ConversationWithUsers = Conversation & {
  teacher: User;
  school: User;
  messages: Message[];
};

export default function Messages() {
  const { toast } = useToast();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const { data: conversations, isLoading } = useQuery<ConversationWithUsers[]>({
    queryKey: ['/api/conversations', user?.id],
    queryFn: async () => {
      const isTeacher = user?.user_metadata?.role === 'teacher';
      const field = isTeacher ? 'teacher_id' : 'school_id';

      const { data, error } = await supabase
        .from('conversations')
        .select('*, teacher:users!teacher_id(*), school:users!school_id(*), messages(*)')
        .eq(field, user?.id)
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      return data as any;
    },
    enabled: !!user?.id,
  });

  const selectedConv = conversations?.find((c) => c.id === selectedConversation);

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConversation || !messageText.trim()) return;

      const { error } = await supabase.from('messages').insert({
        conversation_id: selectedConversation,
        sender_id: user?.id,
        content: messageText.trim(),
      });

      if (error) throw error;

      // Update conversation last_message_at
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', selectedConversation);
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConv?.messages]);

  const filteredConversations = conversations?.filter((conv) => {
    const otherUser = user?.user_metadata?.role === 'teacher' ? conv.school : conv.teacher;
    return otherUser.full_name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getOtherUser = (conv: ConversationWithUsers) => {
    return user?.user_metadata?.role === 'teacher' ? conv.school : conv.teacher;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Layout showMobileNav>
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
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
            {isLoading ? (
              <div className="space-y-2 p-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : filteredConversations && filteredConversations.length > 0 ? (
              filteredConversations.map((conv) => {
                const otherUser = getOtherUser(conv);
                const lastMessage = conv.messages?.[conv.messages.length - 1];

                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv.id)}
                    className={`w-full p-4 flex gap-3 hover-elevate border-b border-card-border text-left ${
                      selectedConversation === conv.id ? 'bg-muted' : ''
                    }`}
                    data-testid={`conversation-${conv.id}`}
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {getInitials(otherUser.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-foreground truncate">
                          {otherUser.full_name}
                        </span>
                        {lastMessage && (
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(lastMessage.sent_at), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
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
              <div className="p-4 border-b border-border flex items-center gap-3">
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
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {getInitials(getOtherUser(selectedConv).full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-semibold text-foreground">
                    {getOtherUser(selectedConv).full_name}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {user?.user_metadata?.role === 'teacher' ? 'School' : 'Teacher'}
                  </p>
                </div>
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
    </Layout>
  );
}
