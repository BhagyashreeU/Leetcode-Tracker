// The curated interview lists: NeetCode 150, in roadmap order, with the
// Blind 75 problems marked. NeetCode 150 contains all of Blind 75, so this one
// list is the union of both. Titles and links only, no problem text.
//
// This file is the source for the Supabase seed (`npm run seed`) and for the
// demo-mode catalog. Topic ids must match src/lib/topics.ts.
import type { Difficulty } from '../data/types'
import { TOPICS, type TopicId } from './topics'

type Entry = [slug: string, title: string, difficulty: 'E' | 'M' | 'H', blind75?: 1]

const LISTS: Record<TopicId, Entry[]> = {
  'arrays-hashing': [
    ['contains-duplicate', 'Contains Duplicate', 'E', 1],
    ['valid-anagram', 'Valid Anagram', 'E', 1],
    ['two-sum', 'Two Sum', 'E', 1],
    ['group-anagrams', 'Group Anagrams', 'M', 1],
    ['top-k-frequent-elements', 'Top K Frequent Elements', 'M', 1],
    ['encode-and-decode-strings', 'Encode and Decode Strings', 'M', 1],
    ['product-of-array-except-self', 'Product of Array Except Self', 'M', 1],
    ['valid-sudoku', 'Valid Sudoku', 'M'],
    ['longest-consecutive-sequence', 'Longest Consecutive Sequence', 'M', 1],
  ],
  'two-pointers': [
    ['valid-palindrome', 'Valid Palindrome', 'E', 1],
    ['two-sum-ii-input-array-is-sorted', 'Two Sum II - Input Array Is Sorted', 'M'],
    ['3sum', '3Sum', 'M', 1],
    ['container-with-most-water', 'Container With Most Water', 'M', 1],
    ['trapping-rain-water', 'Trapping Rain Water', 'H'],
  ],
  'sliding-window': [
    ['best-time-to-buy-and-sell-stock', 'Best Time to Buy and Sell Stock', 'E', 1],
    ['longest-substring-without-repeating-characters', 'Longest Substring Without Repeating Characters', 'M', 1],
    ['longest-repeating-character-replacement', 'Longest Repeating Character Replacement', 'M', 1],
    ['permutation-in-string', 'Permutation in String', 'M'],
    ['minimum-window-substring', 'Minimum Window Substring', 'H', 1],
    ['sliding-window-maximum', 'Sliding Window Maximum', 'H'],
  ],
  stack: [
    ['valid-parentheses', 'Valid Parentheses', 'E', 1],
    ['min-stack', 'Min Stack', 'M'],
    ['evaluate-reverse-polish-notation', 'Evaluate Reverse Polish Notation', 'M'],
    ['generate-parentheses', 'Generate Parentheses', 'M'],
    ['daily-temperatures', 'Daily Temperatures', 'M'],
    ['car-fleet', 'Car Fleet', 'M'],
    ['largest-rectangle-in-histogram', 'Largest Rectangle in Histogram', 'H'],
  ],
  'binary-search': [
    ['binary-search', 'Binary Search', 'E'],
    ['search-a-2d-matrix', 'Search a 2D Matrix', 'M'],
    ['koko-eating-bananas', 'Koko Eating Bananas', 'M'],
    ['find-minimum-in-rotated-sorted-array', 'Find Minimum in Rotated Sorted Array', 'M', 1],
    ['search-in-rotated-sorted-array', 'Search in Rotated Sorted Array', 'M', 1],
    ['time-based-key-value-store', 'Time Based Key-Value Store', 'M'],
    ['median-of-two-sorted-arrays', 'Median of Two Sorted Arrays', 'H'],
  ],
  'linked-list': [
    ['reverse-linked-list', 'Reverse Linked List', 'E', 1],
    ['merge-two-sorted-lists', 'Merge Two Sorted Lists', 'E', 1],
    ['linked-list-cycle', 'Linked List Cycle', 'E', 1],
    ['reorder-list', 'Reorder List', 'M', 1],
    ['remove-nth-node-from-end-of-list', 'Remove Nth Node From End of List', 'M', 1],
    ['copy-list-with-random-pointer', 'Copy List With Random Pointer', 'M'],
    ['add-two-numbers', 'Add Two Numbers', 'M'],
    ['find-the-duplicate-number', 'Find the Duplicate Number', 'M'],
    ['lru-cache', 'LRU Cache', 'M'],
    ['merge-k-sorted-lists', 'Merge k Sorted Lists', 'H', 1],
    ['reverse-nodes-in-k-group', 'Reverse Nodes in k-Group', 'H'],
  ],
  trees: [
    ['invert-binary-tree', 'Invert Binary Tree', 'E', 1],
    ['maximum-depth-of-binary-tree', 'Maximum Depth of Binary Tree', 'E', 1],
    ['diameter-of-binary-tree', 'Diameter of Binary Tree', 'E'],
    ['balanced-binary-tree', 'Balanced Binary Tree', 'E'],
    ['same-tree', 'Same Tree', 'E', 1],
    ['subtree-of-another-tree', 'Subtree of Another Tree', 'E', 1],
    ['lowest-common-ancestor-of-a-binary-search-tree', 'Lowest Common Ancestor of a Binary Search Tree', 'M', 1],
    ['binary-tree-level-order-traversal', 'Binary Tree Level Order Traversal', 'M', 1],
    ['binary-tree-right-side-view', 'Binary Tree Right Side View', 'M'],
    ['count-good-nodes-in-binary-tree', 'Count Good Nodes in Binary Tree', 'M'],
    ['validate-binary-search-tree', 'Validate Binary Search Tree', 'M', 1],
    ['kth-smallest-element-in-a-bst', 'Kth Smallest Element in a BST', 'M', 1],
    ['construct-binary-tree-from-preorder-and-inorder-traversal', 'Construct Binary Tree from Preorder and Inorder Traversal', 'M', 1],
    ['binary-tree-maximum-path-sum', 'Binary Tree Maximum Path Sum', 'H', 1],
    ['serialize-and-deserialize-binary-tree', 'Serialize and Deserialize Binary Tree', 'H', 1],
  ],
  tries: [
    ['implement-trie-prefix-tree', 'Implement Trie (Prefix Tree)', 'M', 1],
    ['design-add-and-search-words-data-structure', 'Design Add and Search Words Data Structure', 'M', 1],
    ['word-search-ii', 'Word Search II', 'H', 1],
  ],
  heap: [
    ['kth-largest-element-in-a-stream', 'Kth Largest Element in a Stream', 'E'],
    ['last-stone-weight', 'Last Stone Weight', 'E'],
    ['k-closest-points-to-origin', 'K Closest Points to Origin', 'M'],
    ['kth-largest-element-in-an-array', 'Kth Largest Element in an Array', 'M'],
    ['task-scheduler', 'Task Scheduler', 'M'],
    ['design-twitter', 'Design Twitter', 'M'],
    ['find-median-from-data-stream', 'Find Median from Data Stream', 'H', 1],
  ],
  backtracking: [
    ['subsets', 'Subsets', 'M'],
    ['combination-sum', 'Combination Sum', 'M', 1],
    ['permutations', 'Permutations', 'M'],
    ['subsets-ii', 'Subsets II', 'M'],
    ['combination-sum-ii', 'Combination Sum II', 'M'],
    ['word-search', 'Word Search', 'M', 1],
    ['palindrome-partitioning', 'Palindrome Partitioning', 'M'],
    ['letter-combinations-of-a-phone-number', 'Letter Combinations of a Phone Number', 'M'],
    ['n-queens', 'N-Queens', 'H'],
  ],
  graphs: [
    ['number-of-islands', 'Number of Islands', 'M', 1],
    ['clone-graph', 'Clone Graph', 'M', 1],
    ['max-area-of-island', 'Max Area of Island', 'M'],
    ['pacific-atlantic-water-flow', 'Pacific Atlantic Water Flow', 'M', 1],
    ['surrounded-regions', 'Surrounded Regions', 'M'],
    ['rotting-oranges', 'Rotting Oranges', 'M'],
    ['walls-and-gates', 'Walls and Gates', 'M'],
    ['course-schedule', 'Course Schedule', 'M', 1],
    ['course-schedule-ii', 'Course Schedule II', 'M'],
    ['redundant-connection', 'Redundant Connection', 'M'],
    ['number-of-connected-components-in-an-undirected-graph', 'Number of Connected Components in an Undirected Graph', 'M', 1],
    ['graph-valid-tree', 'Graph Valid Tree', 'M', 1],
    ['word-ladder', 'Word Ladder', 'H'],
  ],
  'advanced-graphs': [
    ['network-delay-time', 'Network Delay Time', 'M'],
    ['min-cost-to-connect-all-points', 'Min Cost to Connect All Points', 'M'],
    ['cheapest-flights-within-k-stops', 'Cheapest Flights Within K Stops', 'M'],
    ['reconstruct-itinerary', 'Reconstruct Itinerary', 'H'],
    ['swim-in-rising-water', 'Swim in Rising Water', 'H'],
    ['alien-dictionary', 'Alien Dictionary', 'H', 1],
  ],
  '1d-dp': [
    ['climbing-stairs', 'Climbing Stairs', 'E', 1],
    ['min-cost-climbing-stairs', 'Min Cost Climbing Stairs', 'E'],
    ['house-robber', 'House Robber', 'M', 1],
    ['house-robber-ii', 'House Robber II', 'M', 1],
    ['longest-palindromic-substring', 'Longest Palindromic Substring', 'M', 1],
    ['palindromic-substrings', 'Palindromic Substrings', 'M', 1],
    ['decode-ways', 'Decode Ways', 'M', 1],
    ['coin-change', 'Coin Change', 'M', 1],
    ['maximum-product-subarray', 'Maximum Product Subarray', 'M', 1],
    ['word-break', 'Word Break', 'M', 1],
    ['longest-increasing-subsequence', 'Longest Increasing Subsequence', 'M', 1],
    ['partition-equal-subset-sum', 'Partition Equal Subset Sum', 'M'],
  ],
  '2d-dp': [
    ['unique-paths', 'Unique Paths', 'M', 1],
    ['longest-common-subsequence', 'Longest Common Subsequence', 'M', 1],
    ['best-time-to-buy-and-sell-stock-with-cooldown', 'Best Time to Buy and Sell Stock with Cooldown', 'M'],
    ['coin-change-ii', 'Coin Change II', 'M'],
    ['target-sum', 'Target Sum', 'M'],
    ['interleaving-string', 'Interleaving String', 'M'],
    ['edit-distance', 'Edit Distance', 'M'],
    ['longest-increasing-path-in-a-matrix', 'Longest Increasing Path in a Matrix', 'H'],
    ['distinct-subsequences', 'Distinct Subsequences', 'H'],
    ['burst-balloons', 'Burst Balloons', 'H'],
    ['regular-expression-matching', 'Regular Expression Matching', 'H'],
  ],
  greedy: [
    ['maximum-subarray', 'Maximum Subarray', 'M', 1],
    ['jump-game', 'Jump Game', 'M', 1],
    ['jump-game-ii', 'Jump Game II', 'M'],
    ['gas-station', 'Gas Station', 'M'],
    ['hand-of-straights', 'Hand of Straights', 'M'],
    ['merge-triplets-to-form-target-triplet', 'Merge Triplets to Form Target Triplet', 'M'],
    ['partition-labels', 'Partition Labels', 'M'],
    ['valid-parenthesis-string', 'Valid Parenthesis String', 'M'],
  ],
  intervals: [
    ['meeting-rooms', 'Meeting Rooms', 'E', 1],
    ['insert-interval', 'Insert Interval', 'M', 1],
    ['merge-intervals', 'Merge Intervals', 'M', 1],
    ['non-overlapping-intervals', 'Non-overlapping Intervals', 'M', 1],
    ['meeting-rooms-ii', 'Meeting Rooms II', 'M', 1],
    ['minimum-interval-to-include-each-query', 'Minimum Interval to Include Each Query', 'H'],
  ],
  'math-geometry': [
    ['happy-number', 'Happy Number', 'E'],
    ['plus-one', 'Plus One', 'E'],
    ['rotate-image', 'Rotate Image', 'M', 1],
    ['spiral-matrix', 'Spiral Matrix', 'M', 1],
    ['set-matrix-zeroes', 'Set Matrix Zeroes', 'M', 1],
    ['powx-n', 'Pow(x, n)', 'M'],
    ['multiply-strings', 'Multiply Strings', 'M'],
    ['detect-squares', 'Detect Squares', 'M'],
  ],
  'bit-manipulation': [
    ['single-number', 'Single Number', 'E'],
    ['number-of-1-bits', 'Number of 1 Bits', 'E', 1],
    ['counting-bits', 'Counting Bits', 'E', 1],
    ['reverse-bits', 'Reverse Bits', 'E', 1],
    ['missing-number', 'Missing Number', 'E', 1],
    ['sum-of-two-integers', 'Sum of Two Integers', 'M', 1],
    ['reverse-integer', 'Reverse Integer', 'M'],
  ],
}

/** Premium-only on LeetCode. Free versions exist on neetcode.io and LintCode. */
export const PREMIUM = new Set([
  'encode-and-decode-strings',
  'walls-and-gates',
  'number-of-connected-components-in-an-undirected-graph',
  'graph-valid-tree',
  'alien-dictionary',
  'meeting-rooms',
  'meeting-rooms-ii',
])

export interface CuratedEntry {
  slug: string
  title: string
  difficulty: Difficulty
  topic: string
  inBlind75: boolean
  inNeetcode150: boolean
  /** 1-based position in the roadmap. */
  listOrder: number
}

const DIFFICULTY = { E: 'easy', M: 'medium', H: 'hard' } as const

export const CURATED: CuratedEntry[] = TOPICS.map((t) => t.id)
  .flatMap((topic) =>
    LISTS[topic].map(([slug, title, d, blind75]) => ({
      slug,
      title,
      difficulty: DIFFICULTY[d],
      topic,
      inBlind75: blind75 === 1,
      inNeetcode150: true,
    })),
  )
  .map((p, i) => ({ ...p, listOrder: i + 1 }))
