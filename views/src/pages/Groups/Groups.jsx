import { useEffect, useState, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  fetchGroups,
  fetchGroupById,
  createGroup,
  updateGroupAsync,
  deleteGroupAsync,
  addGroupMember,
  removeGroupMember,
} from "../../store/slices/groupSlice";
import { fetchMembers } from "../../store/slices/memberSlice";
import {
  Plus,
  Edit2,
  Trash2,
  Users,
  UserPlus,
  UserMinus,
  X,
  Loader2,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";

// ── Modal shell ──────────────────────────────────────────────────────────────

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
            <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="p-6">{children}</div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Create / Edit form ───────────────────────────────────────────────────────

function GroupForm({ initial, members, onSubmit, submitting }) {
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [leaderId, setLeaderId] = useState(initial?.leader_id || "");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Group name is required"); return; }
    onSubmit({ name: name.trim(), description: description.trim(), leaderId: leaderId || undefined });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="Enter group name"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
          placeholder="Describe the group"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Group Leader</label>
        <select
          value={leaderId}
          onChange={(e) => setLeaderId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">— No leader —</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg font-medium transition-colors"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {initial ? "Update Group" : "Create Group"}
      </button>
    </form>
  );
}

// ── Member management panel ──────────────────────────────────────────────────

function MemberPanel({ group, allMembers, onAdd, onRemove, adding, removing }) {
  const [search, setSearch] = useState("");

  const currentMemberIds = useMemo(
    () => new Set((group.members || []).map((m) => m.id)),
    [group.members]
  );

  const available = useMemo(
    () =>
      allMembers.filter(
        (m) =>
          !currentMemberIds.has(m.id) &&
          m.name?.toLowerCase().includes(search.toLowerCase())
      ),
    [allMembers, currentMemberIds, search]
  );

  return (
    <div className="space-y-4">
      {/* Current members */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Current Members ({group.members?.length || 0})
        </h3>
        {group.members?.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">No members yet.</p>
        )}
        <ul className="space-y-1 max-h-40 overflow-y-auto">
          {(group.members || []).map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700/50"
            >
              <span className="text-sm text-gray-800 dark:text-gray-200">{m.name}</span>
              <button
                type="button"
                onClick={() => onRemove(m.id)}
                disabled={removing === m.id}
                className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
              >
                {removing === m.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserMinus className="w-4 h-4" />
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Add member */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Add Member</h3>
        <div className="relative mb-2">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users…"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <ul className="space-y-1 max-h-40 overflow-y-auto">
          {available.length === 0 && (
            <li className="text-sm text-gray-500 dark:text-gray-400 px-3 py-2">No users available.</li>
          )}
          {available.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              <span className="text-sm text-gray-800 dark:text-gray-200">{m.name}</span>
              <button
                type="button"
                onClick={() => onAdd(m.id)}
                disabled={adding === m.id}
                className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
              >
                {adding === m.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export function Groups() {
  const dispatch = useDispatch();
  const { groups, selectedGroup, loading, error } = useSelector((s) => s.groups);
  const { members } = useSelector((s) => s.members);

  const [showCreate, setShowCreate] = useState(false);
  const [editGroup, setEditGroup] = useState(null);
  const [manageGroup, setManageGroup] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [addingMember, setAddingMember] = useState(null);
  const [removingMember, setRemovingMember] = useState(null);

  useEffect(() => {
    if (groups.length === 0) dispatch(fetchGroups());
    if (members.length === 0) dispatch(fetchMembers());
  }, [dispatch, groups.length, members.length]);

  // ── CRUD handlers ────────────────────────────────────────────────────────

  const handleCreate = async (values) => {
    setSubmitting(true);
    try {
      await dispatch(createGroup(values)).unwrap();
      toast.success("Group created");
      setShowCreate(false);
      dispatch(fetchGroups());
    } catch (msg) {
      toast.error(typeof msg === "string" ? msg : "Create failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (values) => {
    setSubmitting(true);
    try {
      await dispatch(updateGroupAsync({ id: editGroup.id, ...values })).unwrap();
      toast.success("Group updated");
      setEditGroup(null);
      dispatch(fetchGroups());
    } catch (msg) {
      toast.error(typeof msg === "string" ? msg : "Update failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (group) => {
    if (!window.confirm(`Delete "${group.name}"? This cannot be undone.`)) return;
    try {
      await dispatch(deleteGroupAsync(group.id)).unwrap();
      toast.success("Group deleted");
    } catch (msg) {
      toast.error(typeof msg === "string" ? msg : "Delete failed");
    }
  };

  // ── Member handlers ──────────────────────────────────────────────────────

  const openManage = async (group) => {
    const result = await dispatch(fetchGroupById(group.id));
    if (fetchGroupById.fulfilled.match(result)) {
      setManageGroup(result.payload);
    }
  };

  const handleAddMember = async (userId) => {
    setAddingMember(userId);
    try {
      await dispatch(addGroupMember({ groupId: manageGroup.id, userId })).unwrap();
      toast.success("Member added");
      const result = await dispatch(fetchGroupById(manageGroup.id));
      if (fetchGroupById.fulfilled.match(result)) setManageGroup(result.payload);
      dispatch(fetchGroups());
    } catch (msg) {
      toast.error(typeof msg === "string" ? msg : "Failed to add member");
    } finally {
      setAddingMember(null);
    }
  };

  const handleRemoveMember = async (userId) => {
    setRemovingMember(userId);
    try {
      await dispatch(removeGroupMember({ groupId: manageGroup.id, userId })).unwrap();
      toast.success("Member removed");
      const result = await dispatch(fetchGroupById(manageGroup.id));
      if (fetchGroupById.fulfilled.match(result)) setManageGroup(result.payload);
      dispatch(fetchGroups());
    } catch (msg) {
      toast.error(typeof msg === "string" ? msg : "Failed to remove member");
    } finally {
      setRemovingMember(null);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading && groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        <p className="text-gray-600 dark:text-gray-400">Loading groups…</p>
      </div>
    );
  }

  if (error && groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <AlertCircle className="w-10 h-10 text-red-500" />
        <p className="text-gray-700 dark:text-gray-300">{error}</p>
        <button
          onClick={() => dispatch(fetchGroups())}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Groups</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage village banking groups and their members
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          New Group
        </button>
      </div>

      {/* Groups grid */}
      {groups.length === 0 ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No groups yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white dark:bg-gray-800 rounded-xl border p-5 transition-shadow hover:shadow-md ${
                selectedGroup?.id === group.id
                  ? "border-blue-400 dark:border-blue-500 ring-1 ring-blue-200 dark:ring-blue-800"
                  : "border-gray-200 dark:border-gray-700"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 leading-tight">{group.name}</h3>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    type="button"
                    onClick={() => setEditGroup(group)}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500"
                    title="Edit group"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(group)}
                    className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500"
                    title="Delete group"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {group.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{group.description}</p>
              )}

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                  <Users className="w-4 h-4" />
                  <span>{group.member_count || 0} members</span>
                </div>
                {group.leader_name && (
                  <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                    Led by {group.leader_name}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => openManage(group)}
                className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
              >
                <Users className="w-4 h-4" />
                Manage Members
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Modals ────────────────────────────────────────────────────────── */}

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Group">
        <GroupForm members={members} onSubmit={handleCreate} submitting={submitting} />
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editGroup} onClose={() => setEditGroup(null)} title="Edit Group">
        {editGroup && (
          <GroupForm initial={editGroup} members={members} onSubmit={handleUpdate} submitting={submitting} />
        )}
      </Modal>

      {/* Manage members modal */}
      <Modal
        open={!!manageGroup}
        onClose={() => setManageGroup(null)}
        title={manageGroup ? `Members — ${manageGroup.name}` : "Members"}
      >
        {manageGroup && (
          <MemberPanel
            group={manageGroup}
            allMembers={members}
            onAdd={handleAddMember}
            onRemove={handleRemoveMember}
            adding={addingMember}
            removing={removingMember}
          />
        )}
      </Modal>
    </div>
  );
}

export default Groups;
