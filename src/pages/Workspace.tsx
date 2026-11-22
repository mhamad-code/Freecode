import { useStore } from '../store';
import { useMedia } from '../components/ui';
import { ChatEmpty, MessageList } from '../components/Chat';
import { Composer } from '../components/Composer';
import { PanelToolbar } from '../components/Shell';
import { TerminalDock, ToolPane } from '../components/ToolPane';
import { RuntimeBanner } from '../components/RuntimeBanner';

export default function Workspace() {
  const isDesktop = useMedia('(min-width: 1024px)');
  const toolOpen = useStore((s) => s.toolOpen);
  const mode = useStore((s) => s.mode);
  const showChat = !toolOpen || isDesktop;
  const showTools = toolOpen && mode === 'code';

  return (
    <div className="h-full flex flex-col min-h-0">
      <PanelToolbar />
      <RuntimeBanner />
      <div className="flex-1 min-h-0 flex">
        {showChat ? (
          <div className="flex-1 min-w-0 flex flex-col min-h-0">
            <MessageList />
            <Composer />
          </div>
        ) : null}
        {showTools ? (
          <div
            className={isDesktop ? 'w-[45%] min-w-[320px] max-w-[720px] border-s border-[var(--line)] flex-none' : 'flex-1 min-w-0'}
            style={{ background: 'var(--panel)' }}
          >
            <ToolPane />
          </div>
        ) : null}
        {!showChat && !showTools ? <ChatEmpty /> : null}
      </div>
      <TerminalDock />
    </div>
  );
}
