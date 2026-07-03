/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { useCallback, useMemo, useState } from 'react';

export interface TreeNode {
  id: string;
  label: string;
  children?: Array<TreeNode>;
}

export interface UseTreeSelectProps {
  data: Array<TreeNode>;
  isMulti: boolean;
  value: string | Array<string> | null;
  enableSearch: boolean;
}

export function useTreeSelect({
  data,
  isMulti,
  value,
  enableSearch,
}: UseTreeSelectProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [isOpen, setIsOpen] = useState(false);

  // Flatten tree for search
  const flattenTree = useCallback(
    (
      nodes: Array<TreeNode>,
      level = 0,
    ): Array<TreeNode & { level: number }> => {
      return nodes.reduce<Array<TreeNode & { level: number }>>((acc, node) => {
        acc.push({ ...node, level });
        if (node.children) {
          acc.push(...flattenTree(node.children, level + 1));
        }
        return acc;
      }, []);
    },
    [],
  );

  // Filter nodes based on search term
  const filteredData = useMemo(() => {
    if (!enableSearch || !searchTerm) return data;

    const flatNodes = flattenTree(data);
    const matchingNodes = flatNodes.filter((node) =>
      node.label.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    // Include parent nodes of matching nodes
    const relevantNodeIds = new Set<string>();

    for (const node of matchingNodes) {
      relevantNodeIds.add(node.id);
    }

    // Add parent nodes
    const addParentNodes = (nodes: Array<TreeNode>, _parentId?: string) => {
      for (const node of nodes) {
        if (node.children) {
          const hasMatchingChild = node.children.some(
            (child) =>
              relevantNodeIds.has(child.id) || hasMatchingDescendant(child),
          );

          if (hasMatchingChild || relevantNodeIds.has(node.id)) {
            relevantNodeIds.add(node.id);
          }

          addParentNodes(node.children, node.id);
        }
      }
    };

    const hasMatchingDescendant = (node: TreeNode): boolean => {
      if (relevantNodeIds.has(node.id)) return true;
      return (
        node.children?.some((child) => hasMatchingDescendant(child)) || false
      );
    };

    addParentNodes(data);

    // Filter tree to only include relevant nodes
    const filterTree = (nodes: Array<TreeNode>): Array<TreeNode> => {
      return nodes
        .filter(
          (node) => relevantNodeIds.has(node.id) || hasMatchingDescendant(node),
        )
        .map((node) => {
          let filteredChildren: Array<TreeNode> | undefined = undefined;
          if (node.children) {
            filteredChildren = filterTree(node.children);
          }
          return {
            ...node,
            children: filteredChildren,
          };
        });
    };

    return filterTree(data);
  }, [data, searchTerm, enableSearch, flattenTree]);

  // Get selected nodes for display
  const selectedNodes = useMemo(() => {
    const flatNodes = flattenTree(data);
    if (isMulti && Array.isArray(value)) {
      return flatNodes.filter((node) => value.includes(node.id));
    } else if (!isMulti && typeof value === 'string') {
      return flatNodes.filter((node) => node.id === value);
    }
    return [];
  }, [data, value, isMulti, flattenTree]);

  const toggleNode = useCallback((nodeId: string) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  }, []);

  const isSelected = useCallback(
    (nodeId: string): boolean => {
      if (isMulti && Array.isArray(value)) {
        return value.includes(nodeId);
      }
      return value === nodeId;
    },
    [value, isMulti],
  );

  const hasChildren = useCallback((node: TreeNode): boolean => {
    return Boolean(node.children && node.children.length > 0);
  }, []);

  const isExpanded = useCallback(
    (nodeId: string): boolean => {
      return expandedNodes.has(nodeId);
    },
    [expandedNodes],
  );

  return {
    searchTerm,
    setSearchTerm,
    expandedNodes,
    setExpandedNodes,
    isOpen,
    setIsOpen,
    filteredData,
    selectedNodes,
    toggleNode,
    isSelected,
    hasChildren,
    isExpanded,
    flattenTree,
  };
}
