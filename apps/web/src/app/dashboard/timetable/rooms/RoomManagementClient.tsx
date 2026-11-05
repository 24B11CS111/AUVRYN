'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  Building,
  Plus,
  Edit2,
  Trash2,
  ArrowLeft,
  X,
  AlertTriangle,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { createRoomAction, updateRoomAction, deleteRoomAction } from '../actions';

interface RoomManagementClientProps {
  institution: {
    id: string;
    name: string;
  };
  campuses: any[];
  initialRooms: any[];
  initialEntries: any[];
  userRole: string;
}

export function RoomManagementClient({
  institution: _institution,
  campuses,
  initialRooms,
  initialEntries,
  userRole,
}: RoomManagementClientProps) {
  const [rooms, setRooms] = useState<any[]>(initialRooms);
  const [selectedRoomId, setSelectedRoomId] = useState<string>(initialRooms[0]?.id || '');
  const [filterType, setFilterType] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [roomNumber, setRoomNumber] = useState('');
  const [name, setName] = useState('');
  const [building, setBuilding] = useState('');
  const [floor, setFloor] = useState('');
  const [roomType, setRoomType] = useState('classroom');
  const [capacity, setCapacity] = useState<number>(40);
  const [facilitiesStr, setFacilitiesStr] = useState('Projector, Smartboard');
  const [campusId, setCampusId] = useState('');

  const canManage = ['owner', 'admin', 'academic_admin'].includes(userRole);
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  const filteredRooms = rooms.filter((r) => {
    if (filterType !== 'all' && r.room_type !== filterType) return false;
    return true;
  });

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);
  const roomEntries = initialEntries.filter((e) => e.room_id === selectedRoomId);

  const handleOpenNew = () => {
    setEditingRoomId(null);
    setRoomNumber('');
    setName('');
    setBuilding('');
    setFloor('');
    setRoomType('classroom');
    setCapacity(40);
    setFacilitiesStr('Projector, Smartboard');
    setCampusId(campuses[0]?.id || '');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (room: any) => {
    setEditingRoomId(room.id);
    setRoomNumber(room.room_number);
    setName(room.name || '');
    setBuilding(room.building);
    setFloor(room.floor || '');
    setRoomType(room.room_type);
    setCapacity(room.capacity || 40);
    setFacilitiesStr(Array.isArray(room.facilities) ? room.facilities.join(', ') : '');
    setCampusId(room.campus_id || '');
    setIsModalOpen(true);
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const facilitiesArray = facilitiesStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (editingRoomId) {
      const res = await updateRoomAction({
        id: editingRoomId,
        roomNumber,
        name,
        building,
        floor,
        roomType: roomType as any,
        capacity: Number(capacity),
        facilities: facilitiesArray,
        campusId: campusId || undefined,
      });
      setLoading(false);

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to update room');
        return;
      }

      setRooms((prev) =>
        prev.map((r) =>
          r.id === editingRoomId
            ? {
                ...r,
                room_number: roomNumber,
                name,
                building,
                floor,
                room_type: roomType,
                capacity: Number(capacity),
                facilities: facilitiesArray,
                campus_id: campusId,
              }
            : r
        )
      );
      setSuccessMsg('Room updated successfully');
    } else {
      const res = await createRoomAction({
        roomNumber,
        name,
        building,
        floor,
        roomType: roomType as any,
        capacity: Number(capacity),
        facilities: facilitiesArray,
        campusId: campusId || undefined,
        isActive: true,
      });
      setLoading(false);

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to create room');
        return;
      }

      setRooms((prev) => [res.data, ...prev]);
      if (!selectedRoomId) setSelectedRoomId(res.data.id);
      setSuccessMsg('Room created successfully');
    }

    setTimeout(() => setSuccessMsg(null), 3000);
    setIsModalOpen(false);
  };

  const handleDeleteRoom = async (id: string) => {
    if (!confirm('Are you sure you want to delete this room?')) return;
    setLoading(true);
    const res = await deleteRoomAction(id);
    setLoading(false);

    if (!res.success) {
      setErrorMsg(res.error || 'Failed to delete room');
      return;
    }

    setRooms((prev) => prev.filter((r) => r.id !== id));
    if (selectedRoomId === id) setSelectedRoomId('');
    setSuccessMsg('Room removed successfully');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/timetable" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Room & Lab Management</h1>
            <Badge variant="outline" className="text-xs uppercase font-semibold">
              {rooms.length} Total Facilities
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Manage classrooms, computer labs, science labs, auditoriums, and inspect weekly occupancy schedules.
          </p>
        </div>

        {canManage && (
          <Button size="sm" onClick={handleOpenNew} className="flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            Add Room / Lab
          </Button>
        )}
      </div>

      {/* Alert Banners */}
      {errorMsg && (
        <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm flex items-center justify-between border border-destructive/20">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-md bg-emerald-500/10 text-emerald-600 text-sm flex items-center justify-between border border-emerald-500/20">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Grid: Rooms List & Room Occupancy Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rooms Directory */}
        <div className="space-y-4">
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Building className="w-4 h-4 text-primary" />
                Rooms Directory
              </CardTitle>
              <select
                aria-label="Filter by Type"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="text-xs bg-background border border-input rounded px-2 py-1"
              >
                <option value="all">All Types</option>
                <option value="classroom">Classroom</option>
                <option value="laboratory">Laboratory</option>
                <option value="computer_lab">Computer Lab</option>
                <option value="seminar_hall">Seminar Hall</option>
                <option value="auditorium">Auditorium</option>
              </select>
            </CardHeader>
            <CardContent className="p-3">
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredRooms.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-4 text-center">No rooms found</p>
                ) : (
                  filteredRooms.map((room) => {
                    const isSelected = room.id === selectedRoomId;
                    return (
                      <div
                        key={room.id}
                        onClick={() => setSelectedRoomId(room.id)}
                        className={`p-3 rounded-md border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-primary bg-primary/5 shadow-xs'
                            : 'border-border hover:border-primary/40 bg-card'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-sm text-foreground">
                                Room {room.room_number}
                              </span>
                              {room.name && (
                                <span className="text-xs text-muted-foreground">({room.name})</span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {room.building} {room.floor ? `• ${room.floor}` : ''}
                            </p>
                          </div>

                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-[10px] uppercase">
                              {room.room_type}
                            </Badge>
                            {canManage && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEdit(room);
                                  }}
                                  className="p-1 text-muted-foreground hover:text-foreground"
                                  title="Edit"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteRoom(room.id);
                                  }}
                                  className="p-1 text-destructive/70 hover:text-destructive"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
                          <span>Capacity: {room.capacity} seats</span>
                          {room.facilities && room.facilities.length > 0 && (
                            <span className="line-clamp-1 truncate max-w-[150px]">
                              {room.facilities.join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Selected Room Occupancy & Schedule */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Room Occupancy Schedule: {selectedRoom ? `Room ${selectedRoom.room_number}` : 'Select Room'}
                </CardTitle>
                {selectedRoom && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedRoom.building} • {selectedRoom.capacity} seats • Type:{' '}
                    <span className="capitalize">{selectedRoom.room_type}</span>
                  </p>
                )}
              </div>
              {selectedRoom && (
                <div className="text-xs text-muted-foreground">
                  {roomEntries.length} weekly classes allocated
                </div>
              )}
            </CardHeader>
            <CardContent>
              {!selectedRoom ? (
                <div className="p-12 text-center text-muted-foreground text-sm">
                  Select a room from the directory to inspect its weekly schedule.
                </div>
              ) : roomEntries.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-border rounded-lg">
                  <Building className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-semibold text-foreground">Room is completely unoccupied</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    No classes have been scheduled in this room yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {days.map((day) => {
                    const dayEntries = roomEntries.filter((e) => e.day_of_week === day);
                    if (dayEntries.length === 0) return null;

                    return (
                      <div key={day} className="border border-border rounded-md p-3">
                        <div className="font-bold text-xs uppercase text-primary mb-2 flex items-center justify-between border-b border-border pb-1.5">
                          <span>{day}</span>
                          <span className="text-[11px] font-normal text-muted-foreground">
                            {dayEntries.length} sessions
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {dayEntries.map((ent) => (
                            <div
                              key={ent.id}
                              className="p-2.5 rounded bg-muted/30 border border-border text-xs space-y-1"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-foreground">
                                  Period {ent.period_number}
                                </span>
                                <span className="font-mono text-[10px] text-muted-foreground">
                                  {ent.start_time?.slice(0, 5)} - {ent.end_time?.slice(0, 5)}
                                </span>
                              </div>
                              <div className="font-semibold text-foreground line-clamp-1">
                                {ent.subject?.name}
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                Class: {ent.academic_class?.name}
                                {ent.academic_section?.name ? ` (${ent.academic_section.name})` : ''}
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                Faculty: {ent.faculty?.first_name} {ent.faculty?.last_name}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ============================================================================== */}
      {/* Room Modal: Create / Edit Room */}
      {/* ============================================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in-50">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">
                {editingRoomId ? 'Edit Room / Lab' : 'Add New Room / Lab'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRoom} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground">Room Number / Code *</label>
                  <Input
                    type="text"
                    placeholder="e.g. 101 or L-204"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    required
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">Friendly Name</label>
                  <Input
                    type="text"
                    placeholder="e.g. Physics Lab 1"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground">Building / Wing *</label>
                  <Input
                    type="text"
                    placeholder="e.g. Block A"
                    value={building}
                    onChange={(e) => setBuilding(e.target.value)}
                    required
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">Floor</label>
                  <Input
                    type="text"
                    placeholder="e.g. Ground Floor"
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground">Facility Type *</label>
                  <select
                    value={roomType}
                    onChange={(e) => setRoomType(e.target.value)}
                    className="mt-1 w-full text-xs bg-background border border-input rounded-md p-2"
                  >
                    <option value="classroom">Classroom</option>
                    <option value="laboratory">Laboratory</option>
                    <option value="computer_lab">Computer Lab</option>
                    <option value="seminar_hall">Seminar Hall</option>
                    <option value="auditorium">Auditorium</option>
                    <option value="library">Library</option>
                    <option value="workshop">Workshop</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">Seating Capacity *</label>
                  <Input
                    type="number"
                    min={1}
                    max={2000}
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    required
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground">Facilities (comma-separated)</label>
                <Input
                  type="text"
                  placeholder="e.g. Projector, Smartboard, Computers, AC"
                  value={facilitiesStr}
                  onChange={(e) => setFacilitiesStr(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Room'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
