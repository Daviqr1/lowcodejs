/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { useCallback, useState } from 'react';

import type { TreeNode } from './tree-list';

type NodeFormData = {
  id: string;
  label: string;
  selectable: boolean;
};

export const useTreeEditor = (
  initialData: Array<TreeNode> = [],
  onChange?: (data: Array<TreeNode>) => void,
) => {
  const [treeData, setTreeData] = useState<Array<TreeNode>>(initialData);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addFormType, setAddFormType] = useState<'root' | 'child'>('root');

  const generateId = () =>
    Math.floor(100000 + Math.random() * 900000).toString();

  const findNodeById = useCallback(
    (nodes: Array<TreeNode>, id: string): TreeNode | null => {
      for (const node of nodes) {
        if (node.id === id) return node;
        if (node.children) {
          const found = findNodeById(node.children, id);
          if (found) return found;
        }
      }
      return null;
    },
    [],
  );

  const addNodeToParent = useCallback(
    (
      nodes: Array<TreeNode>,
      parentId: string | null,
      newNode: TreeNode,
    ): Array<TreeNode> => {
      if (parentId === null) {
        return [...nodes, newNode];
      }

      return nodes.map((node) => {
        if (node.id === parentId) {
          return {
            ...node,
            children: [...(node.children || []), newNode],
          };
        }
        if (node.children) {
          return {
            ...node,
            children: addNodeToParent(node.children, parentId, newNode),
          };
        }
        return node;
      });
    },
    [],
  );

  const updateNode = useCallback(
    (
      nodes: Array<TreeNode>,
      nodeId: string,
      updates: Partial<TreeNode>,
    ): Array<TreeNode> => {
      return nodes.map((node) => {
        if (node.id === nodeId) {
          return { ...node, ...updates };
        }
        if (node.children) {
          return {
            ...node,
            children: updateNode(node.children, nodeId, updates),
          };
        }
        return node;
      });
    },
    [],
  );

  const removeNode = useCallback(
    (nodes: Array<TreeNode>, nodeId: string): Array<TreeNode> => {
      return nodes.filter((node) => {
        if (node.id === nodeId) return false;
        if (node.children) {
          node.children = removeNode(node.children, nodeId);
        }
        return true;
      });
    },
    [],
  );

  const handleAddRootNode = () => {
    setAddFormType('root');
    setShowAddForm(true);
  };

  const handleAddChildNode = () => {
    if (!selectedNodeId) return;
    setAddFormType('child');
    setShowAddForm(true);
  };

  const handleSaveNewNode = (nodeData: NodeFormData) => {
    const newNode: TreeNode = {
      id: nodeData.id,
      label: nodeData.label,
      selectable: nodeData.selectable,
      children: [],
    };

    let parentId: string | null = null;
    if (addFormType === 'child') {
      parentId = selectedNodeId;
    }
    const updatedData = addNodeToParent(treeData, parentId, newNode);
    setTreeData(updatedData);
    onChange?.(updatedData);
    setShowAddForm(false);
  };

  const handleCancelAdd = () => {
    setShowAddForm(false);
  };

  const handleEditNode = (nodeId: string) => {
    setEditingNodeId(nodeId);
  };

  const handleSaveEdit = (nodeId: string, label: string) => {
    if (!label.trim()) return;

    const updatedData = updateNode(treeData, nodeId, { label });
    setTreeData(updatedData);
    onChange?.(updatedData);
    setEditingNodeId(null);
  };

  const handleCancelEdit = () => {
    setEditingNodeId(null);
  };

  const handleDeleteNode = () => {
    if (!selectedNodeId) return;
    const updatedData = removeNode(treeData, selectedNodeId);
    setTreeData(updatedData);
    onChange?.(updatedData);
    setSelectedNodeId(null);
  };

  const handleReorder = (updatedData: Array<TreeNode>) => {
    setTreeData(updatedData);
    onChange?.(updatedData);
  };

  return {
    treeData,
    selectedNodeId,
    editingNodeId,
    showAddForm,
    addFormType,
    setSelectedNodeId,
    generateId,
    findNodeById,
    handleAddRootNode,
    handleAddChildNode,
    handleSaveNewNode,
    handleCancelAdd,
    handleEditNode,
    handleSaveEdit,
    handleCancelEdit,
    handleDeleteNode,
    handleReorder,
  };
};
