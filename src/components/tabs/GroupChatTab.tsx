import React from 'react';
import { motion } from 'motion/react';
import { User, DiscussionTopic, DiscussionMessage } from '../../types';
import { HolidayBanner } from '../layout/HolidayBanner';
import { GroupChatPage } from '../../pages/GroupChatPage';

interface GroupChatTabProps {
  effectiveUser: User;
  allUsers: User[];
  discussionTopics: DiscussionTopic[];
  discussionMessages: DiscussionMessage[];
  sendDiscussionMessage: any;
  updateDiscussionMessageReactions: any;
  createTopic: any;
  updateTopic: any;
  deleteTopic: any;
  deleteTopicsBulk: any;
  deleteDiscussionMessage: any;
  presence: any[];
  markAsRead: (id: string) => void;
  lastReadChatTimestamps: Record<string, number>;
}

export const GroupChatTab: React.FC<GroupChatTabProps> = ({
  effectiveUser, allUsers, discussionTopics, discussionMessages,
  sendDiscussionMessage, updateDiscussionMessageReactions, createTopic,
  updateTopic, deleteTopic, deleteTopicsBulk, deleteDiscussionMessage,
  presence, markAsRead, lastReadChatTimestamps
}) => {
  return (
    <motion.div 
      key="group_chat" 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="h-full flex flex-col overflow-hidden"
    >
      <HolidayBanner />
      <GroupChatPage
        currentUser={effectiveUser} users={allUsers} topics={discussionTopics} messages={discussionMessages}
        onSendMessage={(topicId, content, attachments) => sendDiscussionMessage(topicId, content, effectiveUser.uniqueKey, attachments)}
        onReact={(msgId, emoji) => {
          const msg = discussionMessages.find((m) => m.id === msgId);
          if (!msg) return;
          const reactions = [...(msg.reactions || [])];
          const idx = reactions.findIndex(r => (r.userId === effectiveUser.id || r.userId === effectiveUser.uniqueKey) && r.emoji === emoji);
          if (idx > -1) reactions.splice(idx, 1);
          else reactions.push({ userId: effectiveUser.uniqueKey, emoji });
          updateDiscussionMessageReactions(msgId, reactions);
        }}
        onCreateTopic={(title, desc, orderCode) => createTopic({
          title, description: desc, createdBy: effectiveUser.uniqueKey, creatorAvatar: effectiveUser.avatar, status: "OPEN", orderCode,
        })}
        onUpdateTopic={updateTopic} onDeleteTopic={deleteTopic} onDeleteTopicsBulk={deleteTopicsBulk} onDeleteMessage={deleteDiscussionMessage}
        presence={presence.map(p => p.id)}
        markAsRead={markAsRead}
        lastReadChatTimestamps={lastReadChatTimestamps}
      />
    </motion.div>
  );
};
