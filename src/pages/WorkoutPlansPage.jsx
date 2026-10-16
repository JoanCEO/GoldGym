import { useEffect, useState } from 'react'
import { Plus, Dumbbell, Edit2, Trash2, ChevronDown, ChevronUp, Copy } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { Button, EmptyState, Modal, Input, Textarea, ConfirmModal, Spinner } from '@/components/ui'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const WEEKDAYS_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

function ExerciseForm({ exercise, onChange, onRemove }) {
  return (
    <div className="bg-brand-card2 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-brand-sub uppercase tracking-wider">Exercício</span>
        <button onClick={onRemove} className="text-brand-sub hover:text-red-400 transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <Input
        placeholder="Nome do exercício"
        value={exercise.name}
        onChange={e => onChange({ ...exercise, name: e.target.value })}
      />
      <div className="grid grid-cols-3 gap-2">
        <Input placeholder="Séries" type="number" min="1"
          value={exercise.sets} onChange={e => onChange({ ...exercise, sets: e.target.value })} />
        <Input placeholder="Reps" type="number" min="1"
          value={exercise.reps} onChange={e => onChange({ ...exercise, reps: e.target.value })} />
        <Input placeholder="Carga (kg)" type="number" min="0"
          value={exercise.weight} onChange={e => onChange({ ...exercise, weight: e.target.value })} />
      </div>
      <Input placeholder="Observações (opcional)"
        value={exercise.notes} onChange={e => onChange({ ...exercise, notes: e.target.value })} />
    </div>
  )
}

function PlanCard({ plan, onEdit, onDelete, onDuplicate }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="card">
      <div className="p-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-brand-text">{plan.name}</h3>
          <div className="flex flex-wrap gap-1 mt-1">
            {plan.days?.map(d => (
              <span key={d} className="badge-gray text-xs">{WEEKDAYS_FULL[d]}</span>
            ))}
          </div>
          <p className="text-xs text-brand-sub mt-1">
            {plan.exercises?.length || 0} exercício{plan.exercises?.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onDuplicate} className="btn-ghost p-2 rounded-lg" title="Duplicar">
            <Copy className="w-4 h-4" />
          </button>
          <button onClick={onEdit} className="btn-ghost p-2 rounded-lg" title="Editar">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={onDelete} className="btn-ghost p-2 rounded-lg text-red-400" title="Excluir">
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={() => setExpanded(v => !v)} className="btn-ghost p-2 rounded-lg">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && plan.exercises?.length > 0 && (
        <div className="px-4 pb-4 border-t border-brand-border pt-3 space-y-2">
          {plan.exercises.map((ex, i) => (
            <div key={i} className="flex items-start justify-between bg-brand-card2 rounded-lg px-3 py-2">
              <div>
                <p className="text-sm font-medium text-brand-text">{ex.name}</p>
                <p className="text-xs text-brand-sub">
                  {ex.sets}x{ex.reps}{ex.weight ? ` — ${ex.weight}kg` : ''}
                  {ex.notes ? ` — ${ex.notes}` : ''}
                </p>
              </div>
              <span className="text-xs font-bold text-brand-red">#{i + 1}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PlanModal({ open, onClose, plan, onSaved }) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [selectedDays, setSelectedDays] = useState([])
  const [exercises, setExercises] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (plan) {
      setName(plan.name)
      setSelectedDays(plan.days || [])
      setExercises(plan.exercises || [])
    } else {
      setName('')
      setSelectedDays([])
      setExercises([{ name: '', sets: '', reps: '', weight: '', notes: '' }])
    }
  }, [plan, open])

  const addExercise = () =>
    setExercises(prev => [...prev, { name: '', sets: '', reps: '', weight: '', notes: '' }])

  const updateExercise = (i, ex) =>
    setExercises(prev => prev.map((e, idx) => idx === i ? ex : e))

  const removeExercise = (i) =>
    setExercises(prev => prev.filter((_, idx) => idx !== i))

  const toggleDay = (d) =>
    setSelectedDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])

  const handleSave = async () => {
    if (!name.trim()) { setError('Dê um nome à ficha.'); return }
    setError('')
    setSaving(true)
    try {
      const planData = {
        user_id: user.id,
        name: name.trim(),
        days: selectedDays,
        exercises: exercises.filter(e => e.name.trim()),
      }
      let result
      if (plan?.id) {
        const { data } = await supabase.from('workout_plans').update(planData)
          .eq('id', plan.id).eq('user_id', user.id).select().single()
        result = data
      } else {
        const { data } = await supabase.from('workout_plans').insert(planData).select().single()
        result = data
      }
      onSaved(result, !!plan)
      onClose()
    } catch (err) {
      setError(err.message || 'Erro ao salvar ficha.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={plan ? 'Editar ficha' : 'Nova ficha'} className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <div className="space-y-5">
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <Input label="Nome da ficha" placeholder="Ex: Treino A — Peito e Tríceps"
          value={name} onChange={e => setName(e.target.value)} />

        <div>
          <label className="label">Dias da semana</label>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((d, i) => (
              <button key={d} onClick={() => toggleDay(i)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  selectedDays.includes(i)
                    ? 'bg-brand-red text-white'
                    : 'bg-brand-card2 text-brand-sub hover:text-brand-text border border-brand-border'
                }`}>
                {d}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="label mb-0">Exercícios</label>
            <button onClick={addExercise} className="btn-ghost text-xs flex items-center gap-1">
              <Plus className="w-3 h-3" /> Adicionar
            </button>
          </div>
          <div className="space-y-3">
            {exercises.map((ex, i) => (
              <ExerciseForm key={i} exercise={ex}
                onChange={(e) => updateExercise(i, e)}
                onRemove={() => removeExercise(i)} />
            ))}
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-2 border-t border-brand-border">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} loading={saving}>
            {plan ? 'Salvar' : 'Criar ficha'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default function WorkoutPlansPage() {
  const { user } = useAuth()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)

  useEffect(() => { loadPlans() }, [user])

  async function loadPlans() {
    if (!user) return
    setLoading(true)
    const { data } = await supabase.from('workout_plans')
      .select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setPlans(data || [])
    setLoading(false)
  }

  const handleSaved = (plan, isEdit) => {
    if (isEdit) setPlans(prev => prev.map(p => p.id === plan.id ? plan : p))
    else setPlans(prev => [plan, ...prev])
  }

  const handleDelete = async () => {
    await supabase.from('workout_plans').delete().eq('id', deletingId)
    setPlans(prev => prev.filter(p => p.id !== deletingId))
    setDeletingId(null)
  }

  const handleDuplicate = async (plan) => {
    const { data } = await supabase.from('workout_plans').insert({
      user_id: user.id,
      name: `${plan.name} (cópia)`,
      days: plan.days,
      exercises: plan.exercises,
    }).select().single()
    if (data) setPlans(prev => [data, ...prev])
  }

  const filteredPlans = selectedDay !== null
    ? plans.filter(p => p.days?.includes(selectedDay))
    : plans

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-bold text-2xl text-brand-text">Minhas fichas</h1>
        <Button size="sm" onClick={() => { setEditingPlan(null); setShowModal(true) }}>
          <Plus className="w-4 h-4" /> Nova ficha
        </Button>
      </div>

      {/* Filtro por dia */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedDay(null)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            selectedDay === null ? 'bg-brand-red text-white' : 'btn-secondary'
          }`}
        >
          Todos
        </button>
        {WEEKDAYS.map((d, i) => (
          <button key={d} onClick={() => setSelectedDay(selectedDay === i ? null : i)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              selectedDay === i ? 'bg-brand-red text-white' : 'btn-secondary'
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : filteredPlans.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title={selectedDay !== null ? `Nenhuma ficha para ${WEEKDAYS_FULL[selectedDay]}` : 'Nenhuma ficha criada'}
          description={selectedDay !== null ? 'Crie uma ficha e associe a este dia.' : 'Crie sua primeira ficha de musculação.'}
          action={
            <Button onClick={() => { setEditingPlan(null); setShowModal(true) }}>
              <Plus className="w-4 h-4" /> Criar ficha
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredPlans.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onEdit={() => { setEditingPlan(plan); setShowModal(true) }}
              onDelete={() => setDeletingId(plan.id)}
              onDuplicate={() => handleDuplicate(plan)}
            />
          ))}
        </div>
      )}

      <PlanModal
        open={showModal}
        onClose={() => setShowModal(false)}
        plan={editingPlan}
        onSaved={handleSaved}
      />

      <ConfirmModal
        open={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Excluir ficha"
        message="Tem certeza que deseja excluir esta ficha de treino?"
        confirmText="Excluir"
      />
    </div>
  )
}
