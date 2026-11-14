import React, { useState, useEffect } from 'react';
import {
  Mail,
  Calendar,
  X,
  ShieldCheck,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  UserCheck,
} from 'lucide-react';
import { HumanAgent, MeetingValidationResult } from '../types/brokerage';

interface WorkspaceConfirmModalProps {
  isOpen: boolean;
  type: 'gmail' | 'calendar';
  employeeName: string;
  connectedEmail: string | null;
  humanAgents?: HumanAgent[];
  initialData: {
    recipientEmail?: string;
    subject?: string;
    body?: string;
    eventSummary?: string;
    eventDescription?: string;
    eventStartIso?: string;
    eventDurationMinutes?: number;
    attendeeEmail?: string;
    assignedAgentId?: string;
  };
  isSubmitting: boolean;
  onValidateMeeting?: (params: {
    agentId: string;
    attendeeEmail: string;
    startIso: string;
    durationMinutes: number;
  }) => Promise<MeetingValidationResult>;
  onCancel: () => void;
  onConfirm: (editedData: {
    recipientEmail?: string;
    subject?: string;
    body?: string;
    eventSummary?: string;
    eventDescription?: string;
    eventStartIso?: string;
    eventDurationMinutes?: number;
    attendeeEmail?: string;
    assignedAgentId?: string;
  }) => Promise<void>;
}

function toDatetimeLocalValue(iso?: string): string {
  const d = iso ? new Date(iso) : new Date(Date.now() + 86400000);
  if (isNaN(d.getTime())) {
    const fallback = new Date(Date.now() + 86400000);
    fallback.setHours(14, 0, 0, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${fallback.getFullYear()}-${pad(fallback.getMonth() + 1)}-${pad(fallback.getDate())}T${pad(fallback.getHours())}:${pad(fallback.getMinutes())}`;
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const WorkspaceConfirmModal: React.FC<WorkspaceConfirmModalProps> = ({
  isOpen,
  type,
  employeeName,
  connectedEmail,
  humanAgents = [],
  initialData,
  isSubmitting,
  onValidateMeeting,
  onCancel,
  onConfirm,
}) => {
  const [formData, setFormData] = useState({
    ...initialData,
    assignedAgentId:
      initialData.assignedAgentId || humanAgents[0]?.id || 'agent-1',
    eventStartIso:
      initialData.eventStartIso ||
      new Date(Date.now() + 86400000).toISOString(),
    eventDurationMinutes: initialData.eventDurationMinutes || 45,
  });

  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);
  const [validationResult, setValidationResult] =
    useState<MeetingValidationResult | null>(null);

  useEffect(() => {
    if (type !== 'calendar' || !onValidateMeeting || !isOpen) return;
    let cancelled = false;
    setIsCheckingConflicts(true);
    onValidateMeeting({
      agentId: formData.assignedAgentId || humanAgents[0]?.id || 'agent-1',
      attendeeEmail: formData.attendeeEmail || '',
      startIso: formData.eventStartIso,
      durationMinutes: Number(formData.eventDurationMinutes) || 45,
    })
      .then((res) => {
        if (!cancelled) {
          setValidationResult(res);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsCheckingConflicts(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    isOpen,
    type,
    formData.assignedAgentId,
    formData.attendeeEmail,
    formData.eventStartIso,
    formData.eventDurationMinutes,
  ]);

  if (!isOpen) return null;

  const hasCalendarConflict =
    type === 'calendar' &&
    validationResult !== null &&
    !validationResult.valid;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            {type === 'gmail' ? (
              <Mail className="w-4 h-4 text-amber-400" />
            ) : (
              <Calendar className="w-4 h-4 text-amber-400" />
            )}
            <h3 className="text-sm font-semibold">
              {type === 'gmail'
                ? `Confirm Gmail Send (${employeeName})`
                : `Schedule & Validate Calendar Showing (${employeeName})`}
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-white transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
          {type === 'gmail' ? (
            <>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  To (Recipient Email)
                </label>
                <input
                  type="email"
                  value={formData.recipientEmail || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, recipientEmail: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={formData.subject || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, subject: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Email Body
                </label>
                <textarea
                  rows={5}
                  value={formData.body || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, body: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Event / Showing Summary
                </label>
                <input
                  type="text"
                  value={formData.eventSummary || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, eventSummary: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Assigned Human Agent (Calendar Check)
                  </label>
                  <select
                    value={formData.assignedAgentId || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        assignedAgentId: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium text-slate-900"
                  >
                    {humanAgents.map((ag) => (
                      <option key={ag.id} value={ag.id}>
                        {ag.name} ({ag.calendarId || ag.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Client / Lead Email
                  </label>
                  <input
                    type="email"
                    value={formData.attendeeEmail || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        attendeeEmail: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Proposed Date & Start Time
                  </label>
                  <input
                    type="datetime-local"
                    value={toDatetimeLocalValue(formData.eventStartIso)}
                    onChange={(e) => {
                      const d = new Date(e.target.value);
                      if (!isNaN(d.getTime())) {
                        setFormData({
                          ...formData,
                          eventStartIso: d.toISOString(),
                        });
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min={15}
                    max={240}
                    value={formData.eventDurationMinutes || 45}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        eventDurationMinutes: Number(e.target.value) || 45,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* AUTOMATIC CONFLICT VALIDATION LAYER */}
              <div className="rounded-xl border overflow-hidden">
                <div
                  className={`px-3.5 py-2.5 flex items-center justify-between border-b ${
                    isCheckingConflicts
                      ? 'bg-slate-50 border-slate-200 text-slate-700'
                      : hasCalendarConflict
                      ? 'bg-rose-50 border-rose-200 text-rose-900'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold">
                    {isCheckingConflicts ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
                        <span>
                          Checking Google Calendar & Lead History for Conflicts...
                        </span>
                      </>
                    ) : hasCalendarConflict ? (
                      <>
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>
                          Time Conflict Detected ({validationResult?.conflicts.length}{' '}
                          Overlap
                          {validationResult?.conflicts.length === 1 ? '' : 's'}) —
                          Booking Blocked
                        </span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          Conflict Validation Passed — Slot Available
                        </span>
                      </>
                    )}
                  </div>
                  {validationResult && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/80 border border-slate-200 text-slate-700">
                      {validationResult.checkedGoogleCalendarLive
                        ? 'Live Google Cal + Lead History'
                        : 'Agent Schedule + Lead History'}
                    </span>
                  )}
                </div>

                {!isCheckingConflicts && validationResult && (
                  <div className="p-3 bg-white space-y-2.5">
                    {validationResult.valid ? (
                      <div className="text-[11px] text-slate-600 space-y-1">
                        <p>
                          ✅ Verified no overlapping events on{' '}
                          <strong className="text-slate-900">
                            {validationResult.agentName}
                          </strong>
                          ’s calendar ({validationResult.agentCalendarId}) or in{' '}
                          <strong className="text-slate-900">
                            {validationResult.leadName}
                          </strong>
                          ’s tour & engagement history.
                        </p>
                        {validationResult.warnings.length > 0 && (
                          <div className="mt-1.5 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 space-y-0.5">
                            {validationResult.warnings.map((w, idx) => (
                              <div key={idx}>⚠️ {w}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        <div className="space-y-1.5">
                          {validationResult.conflicts.map((c) => (
                            <div
                              key={c.id}
                              className="p-2.5 rounded-lg bg-rose-50/70 border border-rose-200 text-[11px] space-y-0.5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-rose-900">
                                  {c.title}
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-semibold text-[10px]">
                                  {c.source}
                                </span>
                              </div>
                              <div className="text-rose-700 font-mono text-[10px]">
                                Conflicting Window: {c.formattedTime}
                              </div>
                              <div className="text-slate-600">{c.detail}</div>
                            </div>
                          ))}
                        </div>

                        {validationResult.suggestedSlots.length > 0 && (
                          <div className="pt-1 border-t border-slate-100">
                            <div className="text-[11px] font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-emerald-600" />
                              <span>
                                Select a Conflict-Free Time Slot to Proceed:
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {validationResult.suggestedSlots.map((slot) => (
                                <button
                                  key={slot.startIso}
                                  type="button"
                                  onClick={() =>
                                    setFormData({
                                      ...formData,
                                      eventStartIso: slot.startIso,
                                    })
                                  }
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-[11px] font-semibold transition-colors"
                                >
                                  {slot.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Event Notes & Agenda
                </label>
                <textarea
                  rows={2}
                  value={formData.eventDescription || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      eventDescription: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </>
          )}

          <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              {connectedEmail
                ? `Executing via connected Google account: ${connectedEmail}`
                : 'Will prompt Google Sign-In before executing.'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-slate-200 bg-slate-50 shrink-0">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(formData)}
            disabled={
              isSubmitting || isCheckingConflicts || hasCalendarConflict
            }
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {type === 'gmail'
              ? 'Send Email Now'
              : hasCalendarConflict
              ? 'Resolve Time Conflict to Book'
              : 'Create Calendar Event'}
          </button>
        </div>
      </div>
    </div>
  );
};
