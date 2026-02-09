import type { UnifiedArchiveItem } from '@/lib/types';
import { ChatDetail } from './ChatDetail';
import { ArenaDetail } from './ArenaDetail';
import { ChatLabDetail } from './ChatLabDetail';
import { AgentDetail } from './AgentDetail';

interface Props {
  item: UnifiedArchiveItem;
  detail: { messages?: unknown[]; participants?: unknown[] };
}

export function ArchiveDetailRouter({ item, detail }: Props) {
  const messages = detail.messages || [];
  const participants = detail.participants || [];

  switch (item.productType) {
    case 'chatab':
      return <ArenaDetail messages={messages} item={item} participants={participants} />;
    case 'chatlab':
      return <ChatLabDetail messages={messages} item={item} participants={participants} />;
    case 'chatlab-agent':
      return <AgentDetail messages={messages} item={item} />;
    case 'theater':
      return <ChatLabDetail messages={messages} item={item} participants={participants} />;
    case 'chat':
    default:
      return <ChatDetail messages={messages} item={item} />;
  }
}
