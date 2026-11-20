import type { ToolKind } from '../types';

export type ScenarioStep =
  | { k: 'text'; text: string }
  | { k: 'group'; actions: [ToolKind, string, string][] }
  | { k: 'permission'; action: string; command: string; risk: 'low' | 'medium' | 'high' }
  | { k: 'error'; title: string; message: string; details: string }
  | { k: 'checkpoint' }
  | { k: 'final'; text: string; followUps: string[] };

import type { Mode } from '../types';
import type { Lang } from '../i18n';


export function buildScenario(text: string, mode: Mode, lang: Lang): ScenarioStep[] {
  const ar = lang === 'ar';
  const lower = text.toLowerCase();
  const risky = /rm -rf|--force|force push|permission|delete/.test(lower);
  const failing = /error|fails|failing|stack|bug/.test(lower);

  if (risky) {
    return [
      { k: 'text', text: ar ? 'سأفحص الحالة أولاً. هذا الأمر يحتاج إذنك قبل التشغيل.' : 'Let me inspect the state first. This command needs your approval before it runs.' },
      { k: 'group', actions: [['read', 'Read', 'package.json'], ['cmd', 'Ran', 'git status --short']] },
      {
        k: 'permission',
        action: ar ? 'حذف node_modules وإعادة تثبيت الحزم' : 'Delete node_modules and reinstall dependencies',
        command: 'rm -rf node_modules && npm install',
        risk: 'medium',
      },
      { k: 'group', actions: [['cmd', 'Ran', 'npm install'], ['cmd', 'Ran', 'npm run build']] },
      {
        k: 'final',
        text: ar
          ? 'تمت إعادة تثبيت الحزم والبناء يمر بنجاح. لم ألمس أي ملف مصدري.'
          : 'Dependencies are reinstalled and the build passes. I did not touch any source file.',
        followUps: ar ? ['شغّل الاختبارات', 'اعرض الفروقات', 'أنشئ commit'] : ['Run the tests', 'Show the diff', 'Create a commit'],
      },
    ];
  }

  if (failing) {
    return [
      { k: 'group', actions: [['read', 'Read', 'src/routes/chat.tsx'], ['cmd', 'Ran', 'npm run build']] },
      {
        k: 'error',
        title: ar ? 'فشل البناء' : 'Build failed',
        message: ar ? 'خطأ نوعي في src/routes/chat.tsx عند السطر 18.' : 'A type error in src/routes/chat.tsx at line 18.',
        details:
          'src/routes/chat.tsx:18:24 - error TS2339: Property "reply" does not exist on type "Message".\n\n18     setMessages((m) => [...m, reply]);\n                                       ~~~~~',
      },
    ];
  }

  if (mode === 'plan') {
    return [
      { k: 'text', text: ar ? 'سأضع خطة قبل أي تعديل:' : "Here's a plan before touching anything:" },
      { k: 'group', actions: [['read', 'Read', 'vite.config.ts'], ['read', 'Read', 'src/routes/cli.tsx'], ['browser', 'Opened', 'localhost:5173/chat']] },
      {
        k: 'final',
        text: ar
          ? 'الخطة جاهزة في تبويب «الخطة»: ست خطوات، لا تعديلات قبل اعتمادك.'
          : 'The plan is ready in the Plan tab: six steps, and no edits until you approve it.',
        followUps: ar ? ['عدّل الخطوة الثانية', 'قدّر الوقت', 'ابدأ البناء'] : ['Edit step 2', 'Estimate the time', 'Start building'],
      },
    ];
  }

  return [
    { k: 'checkpoint' },
    { k: 'text', text: ar ? 'سأبدأ بفحص المشروع الحالي.' : "I'll start by inspecting the current project." },
    {
      k: 'group',
      actions: [
        ['read', 'Read', 'package.json'],
        ['read', 'Read', 'src/routes/chat.tsx'],
        ['cmd', 'Ran', 'ls src'],
      ],
    },
    {
      k: 'text',
      text: ar
        ? 'المسارات جاهزة. سأضيف الكتابة التدريجية في `/cli` وأتحقق من البناء.'
        : "The routes are in place. I'll wire the typing animation into `/cli` and check the build.",
    },
    {
      k: 'group',
      actions: [
        ['edit', 'Edited', 'src/routes/cli.tsx'],
        ['edit', 'Edited', 'src/styles.css'],
        ['cmd', 'Ran', 'npm run build'],
      ],
    },
    {
      k: 'final',
      text: ar
        ? 'تم. أصبحت `/cli` تطبع المخرجات حرفاً بحرف، و`/chat` يحتفظ بسلوك المحرر نفسه. البناء يمر بنجاح.'
        : 'Done. `/cli` now streams its output character by character, and `/chat` keeps the same composer behavior. The build passes.',
      followUps: ar
        ? ['تحقق من البناء', 'راجع الفروقات', 'أضف اختباراً']
        : ['Verify the build', 'Review the diff', 'Add a test'],
    },
  ];
}
