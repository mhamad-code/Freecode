import type { FileNode } from './types';

const sortLevel = (nodes: FileNode[]): FileNode[] =>
  [...nodes].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

/** Inserts (or replaces) a directory, creating any missing parents. */
export function insertDir(nodes: FileNode[], path: string): FileNode[] {
  const parts = path.split('/').filter(Boolean);
  const visit = (level: FileNode[], depth: number): FileNode[] => {
    const name = parts[depth];
    const full = parts.slice(0, depth + 1).join('/');
    const existing = level.find((n) => n.type === 'dir' && n.path === full);
    if (depth === parts.length - 1) {
      if (existing) return level;
      return sortLevel([...level, { name, path: full, type: 'dir', children: [] }]);
    }
    if (existing) {
      return level.map((n) =>
        n === existing ? { ...n, children: visit(n.children ?? [], depth + 1) } : n,
      );
    }
    return sortLevel([
      ...level,
      { name, path: full, type: 'dir', children: visit([], depth + 1) },
    ]);
  };
  return visit(nodes, 0);
}

/** Inserts (or updates) a file, creating any missing parent directories. */
export function insertFile(
  nodes: FileNode[],
  path: string,
  status: 'A' | 'M' = 'A',
): FileNode[] {
  const parts = path.split('/').filter(Boolean);
  const visit = (level: FileNode[], depth: number): FileNode[] => {
    const name = parts[depth];
    const full = parts.slice(0, depth + 1).join('/');
    if (depth === parts.length - 1) {
      const existing = level.find((n) => n.type === 'file' && n.path === full);
      if (existing) return level.map((n) => (n === existing ? { ...n, status } : n));
      return sortLevel([...level, { name, path: full, type: 'file', status }]);
    }
    const dir = level.find((n) => n.type === 'dir' && n.path === full);
    if (dir) {
      return level.map((n) =>
        n === dir ? { ...n, children: visit(n.children ?? [], depth + 1) } : n,
      );
    }
    return sortLevel([
      ...level,
      { name, path: full, type: 'dir', children: visit([], depth + 1) },
    ]);
  };
  return visit(nodes, 0);
}

/** Removes the node at `path` (with its subtree). */
export function removeAt(nodes: FileNode[], path: string): FileNode[] {
  return nodes
    .filter((n) => n.path !== path)
    .map((n) => (n.type === 'dir' ? { ...n, children: removeAt(n.children ?? [], path) } : n));
}

/** Rewrites a node and every descendant after a rename or move. */
export function renameAt(nodes: FileNode[], from: string, to: string): FileNode[] {
  const remap = (path: string) => (path === from ? to : `${to}${path.slice(from.length)}`);
  const visit = (level: FileNode[]): FileNode[] =>
    sortLevel(
      level.map((n) => {
        const path = n.path === from || n.path.startsWith(`${from}/`) ? remap(n.path) : n.path;
        const name = path.split('/').pop() ?? n.name;
        return n.type === 'dir'
          ? { ...n, path, name, children: visit(n.children ?? []) }
          : { ...n, path, name };
      }),
    );
  return visit(nodes);
}

/** Every path in a subtree, the node itself first. */
export function subtreePaths(nodes: FileNode[], path: string): { files: string[]; dirs: string[] } {
  const found = findNode(nodes, path);
  if (!found) return { files: [], dirs: [] };
  const files: string[] = [];
  const dirs: string[] = [];
  const walk = (node: FileNode) => {
    if (node.type === 'dir') {
      dirs.push(node.path);
      node.children?.forEach(walk);
    } else {
      files.push(node.path);
    }
  };
  walk(found);
  return { files, dirs };
}

export function findNode(nodes: FileNode[], path: string): FileNode | undefined {
  for (const node of nodes) {
    if (node.path === path) return node;
    if (node.type === 'dir') {
      const hit = findNode(node.children ?? [], path);
      if (hit) return hit;
    }
  }
  return undefined;
}
