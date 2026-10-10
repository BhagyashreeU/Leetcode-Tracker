// Topic ids follow the NeetCode roadmap order. The seeded catalog (thread 3)
// uses the same ids, and topic strength relies on this order for prerequisites.
export const TOPICS = [
  { id: 'arrays-hashing', label: 'Arrays & Hashing' },
  { id: 'two-pointers', label: 'Two Pointers' },
  { id: 'sliding-window', label: 'Sliding Window' },
  { id: 'stack', label: 'Stack' },
  { id: 'binary-search', label: 'Binary Search' },
  { id: 'linked-list', label: 'Linked List' },
  { id: 'trees', label: 'Trees' },
  { id: 'tries', label: 'Tries' },
  { id: 'heap', label: 'Heap / Priority Queue' },
  { id: 'backtracking', label: 'Backtracking' },
  { id: 'graphs', label: 'Graphs' },
  { id: 'advanced-graphs', label: 'Advanced Graphs' },
  { id: '1d-dp', label: '1-D DP' },
  { id: '2d-dp', label: '2-D DP' },
  { id: 'greedy', label: 'Greedy' },
  { id: 'intervals', label: 'Intervals' },
  { id: 'math-geometry', label: 'Math & Geometry' },
  { id: 'bit-manipulation', label: 'Bit Manipulation' },
] as const

export type TopicId = (typeof TOPICS)[number]['id']

const labels = new Map<string, string>(TOPICS.map((t) => [t.id, t.label]))

export function topicLabel(id: string): string {
  return labels.get(id) ?? id
}
