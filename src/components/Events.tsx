import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Event } from '../types';
import { Calendar, Plus, MapPin, Clock, Users, Image as ImageIcon, X, Save, Edit2, Trash2, Search, Download, FileText, ChevronLeft, ChevronRight, Upload } from 'lucide-react';
import { useFirebase } from '../contexts/FirebaseContext';
import { exportToCSV, exportToPDF } from '../utils/exportUtils';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmationModal from './ConfirmationModal';

const Events: React.FC = () => {
  const { isAdmin } = useFirebase();
  const [events, setEvents] = useState<Event[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    date: '',
    location: '',
    time: '',
    photos: [] as string[],
    attendedCount: 0
  });

  const [newPhotoUrl, setNewPhotoUrl] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'events'));
    return () => unsubscribe();
  }, []);

  const filteredEvents = useMemo(() => {
    return events.filter(e => 
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.location?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [events, searchTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = {
        ...formData,
        photos: formData.photos.filter(p => p.trim() !== ''),
        updatedAt: serverTimestamp()
      };

      if (editingEvent) {
        await updateDoc(doc(db, 'events', editingEvent.id!), data);
      } else {
        await addDoc(collection(db, 'events'), {
          ...data,
          attendees: [],
          createdAt: serverTimestamp()
        });
      }
      setShowForm(false);
      setEditingEvent(null);
      setFormData({ name: '', description: '', date: '', location: '', time: '', photos: [], attendedCount: 0 });
    } catch (error) {
      handleFirestoreError(error, editingEvent ? OperationType.UPDATE : OperationType.CREATE, 'events');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      name: event.name,
      description: event.description,
      date: event.date,
      location: event.location || '',
      time: event.time || '',
      photos: event.photos || [],
      attendedCount: event.attendedCount || 0
    });
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (deleteConfirm.id) {
      try {
        await deleteDoc(doc(db, 'events', deleteConfirm.id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'events');
      }
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData(prev => ({
            ...prev,
            photos: [...prev.photos, reader.result as string]
          }));
        };
        reader.readAsDataURL(file as Blob);
      });
    }
  };

  const addPhoto = () => {
    if (newPhotoUrl.trim()) {
      setFormData({ ...formData, photos: [...formData.photos, newPhotoUrl.trim()] });
      setNewPhotoUrl('');
    }
  };

  const removePhoto = (index: number) => {
    setFormData({ ...formData, photos: formData.photos.filter((_, i) => i !== index) });
  };

  const handleExportCSV = () => {
    const data = events.map(({ id, attendees, photos, ...rest }) => ({
      ...rest,
      attendeeCount: attendees?.length || 0,
      photoCount: photos?.length || 0
    }));
    exportToCSV(data, 'community_events');
  };

  const handleExportPDF = () => {
    const data = events.map(e => ({
      Name: e.name,
      Date: e.date,
      Location: e.location || 'N/A',
      Attended: e.attendedCount || 0
    }));
    exportToPDF(data, 'Community Events', 'community_events');
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Community Events</h2>
          <p className="text-gray-500 mt-1">Stay updated with upcoming and past community gatherings</p>
        </div>
        <div className="flex items-center space-x-3">
          {isAdmin && (
            <>
              <button onClick={handleExportCSV} className="p-2 text-gray-400 hover:text-indigo-600" title="Export CSV"><Download size={20} /></button>
              <button onClick={handleExportPDF} className="p-2 text-gray-400 hover:text-indigo-600" title="Export PDF"><FileText size={20} /></button>
              <button
                onClick={() => { setEditingEvent(null); setFormData({ name: '', description: '', date: '', location: '', time: '', photos: [], attendedCount: 0 }); setShowForm(true); }}
                className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
              >
                <Plus size={20} />
                <span>Create Event</span>
              </button>
            </>
          )}
        </div>
      </header>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search events..."
            className="w-full pl-12 pr-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvents.map((event) => (
          <div key={event.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group">
            <div className="h-48 bg-indigo-50 flex items-center justify-center relative cursor-pointer" onClick={() => { setSelectedEvent(event); setCurrentPhotoIndex(0); }}>
              {event.photos && event.photos.length > 0 ? (
                <img src={event.photos[0]} alt={event.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <ImageIcon className="text-indigo-200" size={48} />
              )}
              <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {isAdmin && (
                  <>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleEdit(event); }}
                      className="p-2 bg-white/90 backdrop-blur-sm text-indigo-600 rounded-full shadow-sm hover:bg-white transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ isOpen: true, id: event.id! }); }}
                      className="p-2 bg-white/90 backdrop-blur-sm text-red-600 rounded-full shadow-sm hover:bg-white transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
              <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-indigo-600 shadow-sm">
                {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
              {event.photos && event.photos.length > 1 && (
                <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] text-white font-bold">
                  +{event.photos.length - 1} more
                </div>
              )}
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">{event.name}</h3>
              <p className="text-gray-500 text-sm line-clamp-2 mb-4">{event.description}</p>
              
              <div className="space-y-2">
                <div className="flex items-center text-gray-400 text-sm">
                  <MapPin size={16} className="mr-2" />
                  <span>{event.location || 'Location TBD'}</span>
                </div>
                <div className="flex items-center text-gray-400 text-sm">
                  <Users size={16} className="mr-2" />
                  <span>{event.attendedCount || 0} Attended</span>
                </div>
              </div>

              <button 
                onClick={() => { setSelectedEvent(event); setCurrentPhotoIndex(0); }}
                className="w-full mt-6 py-2 border border-indigo-100 text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 transition-colors"
              >
                View Details
              </button>
            </div>
          </div>
        ))}

        {filteredEvents.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
            <Calendar className="mx-auto text-gray-200 mb-4" size={48} />
            <p className="text-gray-400 font-medium">No events found matching your search</p>
          </div>
        )}
      </div>

      {/* Event Details Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden my-8"
            >
              <div className="relative h-[400px] bg-gray-900 group">
                {selectedEvent.photos && selectedEvent.photos.length > 0 ? (
                  <motion.img 
                    key={currentPhotoIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    src={selectedEvent.photos[currentPhotoIndex]} 
                    alt={selectedEvent.name} 
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon size={64} className="text-gray-700" />
                  </div>
                )}
                
                <button 
                  onClick={() => setSelectedEvent(null)}
                  className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all z-10"
                >
                  <X size={24} />
                </button>

                {selectedEvent.photos && selectedEvent.photos.length > 1 && (
                  <>
                    <button 
                      onClick={() => setCurrentPhotoIndex(prev => (prev === 0 ? selectedEvent.photos.length - 1 : prev - 1))}
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all"
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <button 
                      onClick={() => setCurrentPhotoIndex(prev => (prev === selectedEvent.photos.length - 1 ? 0 : prev + 1))}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all"
                    >
                      <ChevronRight size={24} />
                    </button>
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-2">
                      {selectedEvent.photos.map((_, i) => (
                        <div 
                          key={i} 
                          className={`w-2 h-2 rounded-full transition-all ${i === currentPhotoIndex ? 'bg-white w-6' : 'bg-white/40'}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="p-10 space-y-8">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                  <div className="space-y-4">
                    <h3 className="text-4xl font-bold text-gray-900 leading-tight">{selectedEvent.name}</h3>
                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center px-4 py-2 bg-indigo-50 text-indigo-600 rounded-2xl text-sm font-bold">
                        <Calendar size={16} className="mr-2" />
                        {new Date(selectedEvent.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                      {selectedEvent.time && (
                        <div className="flex items-center px-4 py-2 bg-amber-50 text-amber-600 rounded-2xl text-sm font-bold">
                          <Clock size={16} className="mr-2" />
                          {selectedEvent.time}
                        </div>
                      )}
                      <div className="flex items-center px-4 py-2 bg-emerald-50 text-emerald-600 rounded-2xl text-sm font-bold">
                        <Users size={16} className="mr-2" />
                        {selectedEvent.attendedCount || 0} Attended
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                  <div className="lg:col-span-2 space-y-4">
                    <h4 className="text-lg font-bold text-gray-900">About the Event</h4>
                    <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{selectedEvent.description}</p>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-lg font-bold text-gray-900">Location</h4>
                    <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 flex items-start space-x-4">
                      <div className="p-3 bg-white rounded-2xl shadow-sm">
                        <MapPin size={24} className="text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{selectedEvent.location || 'Location TBD'}</p>
                        <p className="text-sm text-gray-500 mt-1">Community Center Hall</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden my-8">
            <header className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h3 className="text-xl font-bold text-gray-900">{editingEvent ? 'Edit Event' : 'Create New Event'}</h3>
              <button onClick={() => { setShowForm(false); setEditingEvent(null); }} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-200 rounded-full transition-all">
                <X size={20} />
              </button>
            </header>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <label className="text-sm font-bold text-gray-700">Event Name</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <label className="text-sm font-bold text-gray-700">Description</label>
                  <textarea
                    required
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    rows={3}
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Date</label>
                  <input
                    type="date"
                    required
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 10:00 AM"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={formData.time}
                    onChange={e => setFormData({ ...formData, time: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Location</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Attended Count</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={formData.attendedCount}
                    onChange={e => setFormData({ ...formData, attendedCount: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <label className="text-sm font-bold text-gray-700">Event Photos</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
                    {formData.photos.map((url, i) => (
                      <div key={i} className="relative group aspect-video rounded-xl overflow-hidden border border-gray-100 shadow-sm">
                        <img src={url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <button 
                          type="button"
                          onClick={() => removePhoto(i)}
                          className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    <label className="aspect-video rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition-all group">
                      <Upload className="text-gray-400 group-hover:text-indigo-500 transition-colors" size={24} />
                      <span className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-wider">Upload Photos</span>
                      <input type="file" className="hidden" accept="image/*" multiple onChange={handlePhotoUpload} />
                    </label>
                  </div>
                  
                  <div className="mt-4">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Or Add by URL</label>
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                      <input
                        type="url"
                        placeholder="Paste photo URL here..."
                        className="flex-1 px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm"
                        value={newPhotoUrl}
                        onChange={e => setNewPhotoUrl(e.target.value)}
                      />
                      <button 
                        type="button" 
                        onClick={addPhoto}
                        className="px-4 py-2 bg-indigo-50 text-indigo-600 font-bold rounded-xl hover:bg-indigo-100 transition-all text-sm"
                      >
                        Add URL
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <footer className="pt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center space-x-2 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Save size={18} />
                      <span>Save Event</span>
                    </>
                  )}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
        onConfirm={handleDelete}
        title="Delete Event"
        message="Are you sure you want to delete this event? This will permanently remove the event and all associated photos."
      />
    </div>
  );
};

export default Events;
