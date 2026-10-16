import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Plus,
  Dumbbell,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Copy,
  Search,
  Play,
  X,
  ExternalLink,
  RefreshCw,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import {
  Button,
  EmptyState,
  Modal,
  Input,
  ConfirmModal,
  Spinner,
} from '@/components/ui'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const WEEKDAYS_FULL = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
]

let exerciseCatalogPromise = null

function asText(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ')
  return value == null ? '' : String(value)
}

function normalizeSearchText(value) {
  return asText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim()
}

// O Supabase é a única fonte do catálogo. Nome, instruções e GIF vêm do mesmo registro.
function normalizeExercise(exercise) {
  return {
    id: String(exercise.id),
    name: exercise.name || 'Exercício sem nome',
    gifUrl: exercise.gif_url || '',
    targetMuscles: asText(exercise.target_muscles),
    bodyParts: asText(exercise.body_parts),
    equipment: asText(exercise.equipment) || 'Não informado',
    instructions: Array.isArray(exercise.instructions) ? exercise.instructions : [],
    catalogSource: 'goldgym',
    level: asText(exercise.level),
    searchTerms: [
      exercise.name,
      exercise.slug,
      exercise.equipment,
      exercise.body_parts,
      ...(Array.isArray(exercise.target_muscles) ? exercise.target_muscles : []),
    ].filter(Boolean).join(' '),
  }
}

async function getExerciseCatalog() {
  if (!exerciseCatalogPromise) {
    exerciseCatalogPromise = (async () => {
      const { data, error } = await supabase
        .from('exercise_catalog')
        .select('id, slug, name, description, target_muscles, body_parts, equipment, level, instructions, gif_url, gif_alt')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) throw error
      return (data || []).map(normalizeExercise)
    })().catch(error => {
      console.error('[GoldGym] Erro ao carregar catálogo próprio:', error)
      exerciseCatalogPromise = null
      throw new Error(
        'Não foi possível carregar a biblioteca própria. Confira se a migração supabase_exercise_catalog.sql foi executada no Supabase.'
      )
    })
  }

  return exerciseCatalogPromise
}

function ExerciseGif({ src, name, className = '' }) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [src])

  if (!src || failed) {
    return (
      <div
        className={`flex items-center justify-center bg-brand-card2 text-brand-sub ${className}`}
      >
        <Dumbbell className="h-8 w-8 opacity-60" />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={`Demonstração de ${name}`}
      loading="lazy"
      className={`object-contain bg-brand-card2 ${className}`}
      onError={() => setFailed(true)}
    />
  )
}

function ExerciseSearch({ onChoose, onClose }) {
  const [exercises, setExercises] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    getExerciseCatalog()
      .then(data => {
        if (!cancelled) setExercises(data)
      })
      .catch(err => {
        console.error('[GoldGym] Erro ao carregar exercícios:', err)
        if (!cancelled) {
          setError(
            err?.message ||
              'Não foi possível carregar a biblioteca de exercícios.'
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const filteredExercises = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query)

    if (!normalizedQuery) return exercises.slice(0, 60)

    return exercises
      .filter(exercise => {
        const searchable = normalizeSearchText([
          exercise.name,
          exercise.searchTerms,
          exercise.targetMuscles,
          exercise.bodyParts,
          exercise.equipment,
        ].join(' '))

        return searchable.includes(normalizedQuery)
      })
      .slice(0, 100)
  }, [exercises, query])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-brand-text">
            Biblioteca de exercícios
          </h3>
          <p className="text-xs text-brand-sub mt-1">
            Pesquise movimentos e adicione-os à sua ficha.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="btn-ghost rounded-lg p-2"
          aria-label="Fechar biblioteca"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-sub" />
        <input
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Ex.: supino, costas, halteres..."
          className="w-full rounded-xl border border-brand-border bg-brand-card2 py-3 pl-10 pr-4 text-sm text-brand-text outline-none focus:border-brand-red"
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-12">
          <Spinner size="lg" />
          <p className="text-sm text-brand-sub">
            Carregando biblioteca de exercícios...
          </p>
          <p className="text-xs text-brand-sub">
            Os exercícios são carregados do catálogo local do projeto.
          </p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <p className="text-sm text-red-400">{error}</p>
          <button
            type="button"
            onClick={() => {
              exerciseCatalogPromise = null
              setLoading(true)
              setError('')

              getExerciseCatalog()
                .then(data => setExercises(data))
                .catch(err => {
                  console.error(err)
                  setError(
                    err?.message || 'Não foi possível carregar os exercícios.'
                  )
                })
                .finally(() => setLoading(false))
            }}
            className="mt-3 inline-flex items-center gap-2 text-sm text-brand-text hover:text-brand-red"
          >
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </button>
        </div>
      ) : filteredExercises.length === 0 ? (
        <div className="py-10 text-center">
          <Dumbbell className="mx-auto mb-3 h-8 w-8 text-brand-sub" />
          <p className="text-sm text-brand-text">
            Nenhum exercício encontrado.
          </p>
          <p className="mt-1 text-xs text-brand-sub">
            Experimente pesquisar por outro nome, músculo ou equipamento.
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-brand-sub">
            {query.trim()
              ? `${filteredExercises.length} resultado(s) exibidos`
              : `${exercises.length} exercícios carregados`}
          </p>

          <div className="grid max-h-[50vh] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
            {filteredExercises.map(exercise => (
              <div
                key={exercise.id}
                className="overflow-hidden rounded-xl border border-brand-border bg-brand-card"
              >
                <div className="flex h-36 items-center justify-center overflow-hidden">
                  <ExerciseGif
                    src={exercise.gifUrl}
                    name={exercise.name}
                    className="h-full w-full"
                  />
                </div>

                <div className="space-y-2 p-3">
                  <h4 className="text-sm font-semibold capitalize text-brand-text">
                    {exercise.name}
                  </h4>

                  <div className="space-y-1 text-xs text-brand-sub">
                    {exercise.targetMuscles && (
                      <p>
                        <span className="font-medium">Músculos:</span>{' '}
                        {exercise.targetMuscles}
                      </p>
                    )}
                    {exercise.equipment && (
                      <p>
                        <span className="font-medium">Equipamento:</span>{' '}
                        {exercise.equipment}
                      </p>
                    )}
                  </div>

                  <Button
                    size="sm"
                    onClick={() => onChoose(exercise)}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar à ficha
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="text-center text-[11px] text-brand-sub">
        Catálogo local: Exercícios BD PT-BR.
      </p>
    </div>
  )
}

// Hook para buscar sugestões de exercícios conforme o usuário digita
function useExerciseSuggestions(query) {
  const [catalog, setCatalog] = useState([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogError, setCatalogError] = useState('')

  // Carrega o catálogo uma única vez na primeira vez que o hook é usado
  useEffect(() => {
    if (catalog.length > 0 || catalogLoading) return

    setCatalogLoading(true)
    getExerciseCatalog()
      .then(data => setCatalog(data))
      .catch(err => setCatalogError(err?.message || 'Erro ao carregar exercícios.'))
      .finally(() => setCatalogLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const suggestions = useMemo(() => {
    const q = normalizeSearchText(query)
    if (!q || q.length < 2) return []

    return catalog
      .filter(ex => {
        const searchable = normalizeSearchText([
          ex.name, ex.searchTerms, ex.targetMuscles, ex.bodyParts, ex.equipment,
        ].join(' '))
        return searchable.includes(q)
      })
      .slice(0, 8)
  }, [catalog, query])

  return { suggestions, catalogLoading, catalogError }
}

function ExerciseForm({ exercise, onChange, onRemove, onPreview }) {
  const [inputValue, setInputValue] = useState(exercise.name || '')
  const [showDropdown, setShowDropdown] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const wrapperRef = useRef(null)
  const inputRef = useRef(null)

  // Quando o exercício muda por fora (ex: ao editar uma ficha existente), sincroniza
  useEffect(() => {
    setInputValue(exercise.name || '')
  }, [exercise.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const { suggestions, catalogLoading, catalogError } = useExerciseSuggestions(
    // Só busca se o exercício ainda não foi escolhido da biblioteca (sem gifUrl)
    exercise.catalogSource === 'ptbr' || exercise.gifUrl ? '' : inputValue
  )

  const isResolved = exercise.catalogSource === 'ptbr' || !!exercise.gifUrl // exercício veio da biblioteca

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleInputChange(e) {
    const value = e.target.value
    setInputValue(value)
    setHighlightedIndex(-1)
    setShowDropdown(true)

    // Se o usuário editar o nome depois de ter escolhido da biblioteca,
    // descarta os metadados do catálogo para virar entrada manual
    if (exercise.catalogSource === 'ptbr' || exercise.gifUrl) {
      onChange({ ...exercise, name: value, gifUrl: '', catalogSource: '', targetMuscles: '', bodyParts: '', equipment: '', instructions: [], searchTerms: '' })
    } else {
      onChange({ ...exercise, name: value })
    }
  }

  function handleChoose(chosen) {
    const updated = {
      ...exercise,
      id: chosen.id,
      name: chosen.name,
      gifUrl: chosen.gifUrl,
      catalogSource: chosen.catalogSource || '',
      searchTerms: chosen.searchTerms || '',
      targetMuscles: chosen.targetMuscles,
      bodyParts: chosen.bodyParts,
      equipment: chosen.equipment,
      instructions: chosen.instructions,
      sets: exercise.sets || '3',
      reps: exercise.reps || '12',
    }
    setInputValue(chosen.name)
    setShowDropdown(false)
    setHighlightedIndex(-1)
    onChange(updated)
  }

  function handleKeyDown(e) {
    if (!showDropdown || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault()
      handleChoose(suggestions[highlightedIndex])
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
    }
  }

  const openDropdown = suggestions.length > 0 && showDropdown

  return (
    <div className="space-y-3 rounded-xl bg-brand-card2 p-4">
      <div className="flex items-start gap-3">
        {/* Thumbnail do GIF quando exercício está resolvido */}
        {isResolved && exercise.gifUrl && (
          <button
            type="button"
            onClick={() => onPreview(exercise)}
            className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-brand-border"
            title="Ver demonstração"
          >
            <ExerciseGif
              src={exercise.gifUrl}
              name={exercise.name}
              className="h-full w-full"
            />
            <span className="absolute bottom-1 right-1 rounded bg-black/70 p-1 text-white">
              <Play className="h-3 w-3" />
            </span>
          </button>
        )}

        <div className="min-w-0 flex-1" ref={wrapperRef}>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-brand-sub">
            Exercício
          </label>

          {/* Campo com autocomplete */}
          <div className="relative">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-sub" />
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                onKeyDown={handleKeyDown}
                placeholder="Pesquise um exercício..."
                autoComplete="off"
                className="w-full rounded-xl border border-brand-border bg-brand-card py-2.5 pl-9 pr-4 text-sm text-brand-text outline-none focus:border-brand-red"
              />
              {catalogLoading && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Spinner size="sm" />
                </span>
              )}
              {isResolved && (
                <button
                  type="button"
                  title="Trocar exercício"
                  onClick={() => {
                    onChange({ ...exercise, name: '', gifUrl: '', catalogSource: '', searchTerms: '', targetMuscles: '', bodyParts: '', equipment: '', instructions: [] })
                    setInputValue('')
                    setTimeout(() => inputRef.current?.focus(), 0)
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-sub hover:text-brand-red"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Dropdown de sugestões */}
            {openDropdown && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-brand-border bg-brand-card shadow-xl">
                <ul role="listbox" className="max-h-72 overflow-y-auto divide-y divide-brand-border">
                  {suggestions.map((ex, idx) => (
                    <li
                      key={ex.id}
                      role="option"
                      aria-selected={idx === highlightedIndex}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      onMouseDown={e => { e.preventDefault(); handleChoose(ex) }}
                      className={`flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors ${
                        idx === highlightedIndex ? 'bg-brand-red/10' : 'hover:bg-brand-card2'
                      }`}
                    >
                      {/* GIF miniatura */}
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-brand-border bg-brand-card2">
                        <ExerciseGif
                          src={ex.gifUrl}
                          name={ex.name}
                          className="h-full w-full"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold capitalize text-brand-text">
                          {ex.name}
                        </p>
                        {ex.targetMuscles && (
                          <p className="truncate text-xs text-brand-sub">
                            {ex.targetMuscles}
                          </p>
                        )}
                        {ex.equipment && (
                          <p className="truncate text-xs text-brand-sub">
                            {ex.equipment}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>

                <p className="border-t border-brand-border px-3 py-1.5 text-center text-[11px] text-brand-sub">
                  Exercícios BD PT-BR
                </p>
              </div>
            )}
          </div>

          {catalogError && (
            <p className="mt-1 text-xs text-red-400">{catalogError}</p>
          )}

          {/* Metadados do exercício escolhido */}
          {isResolved && (
            <div className="mt-2 space-y-0.5">
              {exercise.targetMuscles && (
                <p className="text-xs text-brand-sub">
                  <span className="font-medium">Músculos:</span> {exercise.targetMuscles}
                </p>
              )}
              {exercise.equipment && (
                <p className="text-xs text-brand-sub">
                  <span className="font-medium">Equipamento:</span> {exercise.equipment}
                </p>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="rounded-lg p-2 text-brand-sub transition-colors hover:text-red-400"
          title="Remover exercício"
          aria-label="Remover exercício"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Input
          placeholder="Séries"
          type="number"
          min="1"
          value={exercise.sets ?? ''}
          onChange={event => onChange({ ...exercise, sets: event.target.value })}
        />
        <Input
          placeholder="Reps"
          type="number"
          min="1"
          value={exercise.reps ?? ''}
          onChange={event => onChange({ ...exercise, reps: event.target.value })}
        />
        <Input
          placeholder="Carga (kg)"
          type="number"
          min="0"
          value={exercise.weight ?? ''}
          onChange={event => onChange({ ...exercise, weight: event.target.value })}
        />
      </div>

      <Input
        placeholder="Observações (opcional)"
        value={exercise.notes || ''}
        onChange={event => onChange({ ...exercise, notes: event.target.value })}
      />

      {isResolved && exercise.instructions?.length > 0 && (
        <button
          type="button"
          onClick={() => onPreview(exercise)}
          className="inline-flex items-center gap-1 text-xs text-brand-red hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          Ver instruções do exercício
        </button>
      )}
    </div>
  )
}

function ExercisePreviewModal({ exercise, onClose }) {
  if (!exercise) return null

  return (
    <Modal
      open={!!exercise}
      onClose={onClose}
      title={exercise.name}
      className="max-w-xl max-h-[90vh] overflow-y-auto"
    >
      <div className="space-y-4">
        <div className="flex min-h-52 items-center justify-center overflow-hidden rounded-xl bg-brand-card2">
          <ExerciseGif
            src={exercise.gifUrl}
            name={exercise.name}
            className="max-h-80 w-full"
          />
        </div>

        {exercise.targetMuscles && (
          <p className="text-sm text-brand-text">
            <span className="font-semibold">Músculos-alvo:</span>{' '}
            {exercise.targetMuscles}
          </p>
        )}

        {exercise.bodyParts && (
          <p className="text-sm text-brand-text">
            <span className="font-semibold">Região do corpo:</span>{' '}
            {exercise.bodyParts}
          </p>
        )}

        {exercise.equipment && (
          <p className="text-sm text-brand-text">
            <span className="font-semibold">Equipamento:</span>{' '}
            {exercise.equipment}
          </p>
        )}

        {exercise.instructions?.length > 0 && (
          <div>
            <h4 className="mb-2 font-semibold text-brand-text">
              Como executar
            </h4>
            <ol className="list-inside list-decimal space-y-2 text-sm text-brand-sub">
              {exercise.instructions.map((instruction, index) => (
                <li key={`${index}-${instruction}`}>{instruction}</li>
              ))}
            </ol>
          </div>
        )}

        <Button className="w-full" onClick={onClose}>
          Fechar
        </Button>
      </div>
    </Modal>
  )
}

function PlanCard({ plan, onEdit, onDelete, onDuplicate }) {
  const [expanded, setExpanded] = useState(false)
  const [previewExercise, setPreviewExercise] = useState(null)

  return (
    <div className="card">
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <h3 className="font-semibold text-brand-text">{plan.name}</h3>

          <div className="mt-1 flex flex-wrap gap-1">
            {plan.days?.map(day => (
              <span key={day} className="badge-gray text-xs">
                {WEEKDAYS_FULL[day]}
              </span>
            ))}
          </div>

          <p className="mt-1 text-xs text-brand-sub">
            {plan.exercises?.length || 0} exercício
            {plan.exercises?.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onDuplicate}
            className="btn-ghost rounded-lg p-2"
            title="Duplicar"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="btn-ghost rounded-lg p-2"
            title="Editar"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="btn-ghost rounded-lg p-2 text-red-400"
            title="Excluir"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setExpanded(value => !value)}
            className="btn-ghost rounded-lg p-2"
            title={expanded ? 'Recolher' : 'Expandir'}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="space-y-3 border-t border-brand-border px-4 pb-4 pt-3">
          {plan.exercises?.length ? (
            plan.exercises.map((exercise, index) => (
              <div
                key={`${exercise.id || exercise.name}-${index}`}
                className="flex items-start gap-3 rounded-lg bg-brand-card2 p-3"
              >
                {exercise.gifUrl && (
                  <button
                    type="button"
                    onClick={() => setPreviewExercise(exercise)}
                    className="h-20 w-20 shrink-0 overflow-hidden rounded-lg"
                    title="Ver demonstração"
                  >
                    <ExerciseGif
                      src={exercise.gifUrl}
                      name={exercise.name}
                      className="h-full w-full"
                    />
                  </button>
                )}

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-brand-text">
                    {exercise.name}
                  </p>
                  <p className="mt-1 text-xs text-brand-sub">
                    {exercise.sets || '—'} séries × {exercise.reps || '—'} reps
                    {exercise.weight ? ` — ${exercise.weight} kg` : ''}
                  </p>

                  {exercise.targetMuscles && (
                    <p className="mt-1 text-xs text-brand-sub">
                      Músculos: {exercise.targetMuscles}
                    </p>
                  )}

                  {exercise.notes && (
                    <p className="mt-1 text-xs text-brand-sub">
                      {exercise.notes}
                    </p>
                  )}

                  {(exercise.gifUrl || exercise.instructions?.length > 0) && (
                    <button
                      type="button"
                      onClick={() => setPreviewExercise(exercise)}
                      className="mt-2 text-xs text-brand-red hover:underline"
                    >
                      Ver demonstração e instruções
                    </button>
                  )}
                </div>

                <span className="text-xs font-bold text-brand-red">
                  #{index + 1}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-brand-sub">
              Esta ficha ainda não possui exercícios.
            </p>
          )}
        </div>
      )}

      <ExercisePreviewModal
        exercise={previewExercise}
        onClose={() => setPreviewExercise(null)}
      />
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
  const [previewExercise, setPreviewExercise] = useState(null)

  useEffect(() => {
    if (!open) return

    setError('')
    setPreviewExercise(null)

    if (plan) {
      setName(plan.name || '')
      setSelectedDays(plan.days || [])
      setExercises(
        (plan.exercises || []).map(exercise => ({
          name: '',
          sets: '',
          reps: '',
          weight: '',
          notes: '',
          ...exercise,
        }))
      )
    } else {
      setName('')
      setSelectedDays([])
      setExercises([
        { name: '', sets: '', reps: '', weight: '', notes: '' },
      ])
    }
  }, [plan, open])

  const addExercise = () => {
    setExercises(previous => [
      ...previous,
      { name: '', sets: '', reps: '', weight: '', notes: '' },
    ])
  }

  const updateExercise = (index, updatedExercise) => {
    setExercises(previous =>
      previous.map((exercise, currentIndex) =>
        currentIndex === index ? updatedExercise : exercise
      )
    )
  }

  const removeExercise = index => {
    setExercises(previous =>
      previous.filter((_, currentIndex) => currentIndex !== index)
    )
  }

  const toggleDay = day => {
    setSelectedDays(previous =>
      previous.includes(day)
        ? previous.filter(item => item !== day)
        : [...previous, day].sort((a, b) => a - b)
    )
  }

  const handleSave = async () => {
    if (!user) {
      setError('Você precisa estar conectado para salvar uma ficha.')
      return
    }

    if (!name.trim()) {
      setError('Dê um nome à ficha.')
      return
    }

    const validExercises = exercises
      .filter(exercise => exercise.name?.trim())
      .map(exercise => ({
        ...exercise,
        name: exercise.name.trim(),
        sets: exercise.sets ?? '',
        reps: exercise.reps ?? '',
        weight: exercise.weight ?? '',
        notes: exercise.notes ?? '',
      }))

    setError('')
    setSaving(true)

    try {
      const planData = {
        user_id: user.id,
        name: name.trim(),
        days: selectedDays,
        exercises: validExercises,
      }

      let result

      if (plan?.id) {
        const { data, error: updateError } = await supabase
          .from('workout_plans')
          .update(planData)
          .eq('id', plan.id)
          .eq('user_id', user.id)
          .select()
          .single()

        if (updateError) throw updateError
        result = data
      } else {
        const { data, error: insertError } = await supabase
          .from('workout_plans')
          .insert(planData)
          .select()
          .single()

        if (insertError) throw insertError
        result = data
      }

      if (!result) {
        throw new Error('Não foi possível confirmar o salvamento da ficha.')
      }

      onSaved(result, !!plan)
      onClose()
    } catch (err) {
      console.error('[GoldGym] Erro ao salvar ficha:', err)
      setError(err.message || 'Erro ao salvar a ficha de treino.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={plan ? 'Editar ficha' : 'Nova ficha'}
        className="max-h-[90vh] max-w-2xl overflow-y-auto"
      >
        <div className="space-y-5">
          {error && (
            <p className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-400">
              {error}
            </p>
          )}

          <Input
            label="Nome da ficha"
            placeholder="Ex.: Treino A — Peito e Tríceps"
            value={name}
            onChange={event => setName(event.target.value)}
          />

          <div>
            <label className="label">Dias da semana</label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((day, index) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(index)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                    selectedDays.includes(index)
                      ? 'bg-brand-red text-white'
                      : 'border border-brand-border bg-brand-card2 text-brand-sub hover:text-brand-text'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <label className="label mb-0">Exercícios</label>

              <button
                type="button"
                onClick={addExercise}
                className="btn-ghost flex items-center gap-1 text-xs"
              >
                <Plus className="h-3 w-3" />
                Adicionar exercício
              </button>
            </div>

            <div className="space-y-3">
              {exercises.map((exercise, index) => (
                <ExerciseForm
                  key={`${exercise.id || 'manual'}-${index}`}
                  exercise={exercise}
                  onChange={updated => updateExercise(index, updated)}
                  onRemove={() => removeExercise(index)}
                  onPreview={setPreviewExercise}
                />
              ))}
            </div>

            {exercises.length === 0 && (
              <p className="rounded-xl bg-brand-card2 p-4 text-sm text-brand-sub">
                Nenhum exercício adicionado. Clique em "Adicionar exercício" e pesquise pelo nome.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-brand-border pt-4">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} loading={saving} disabled={saving}>
              {plan ? 'Salvar alterações' : 'Criar ficha'}
            </Button>
          </div>
        </div>
      </Modal>

      <ExercisePreviewModal
        exercise={previewExercise}
        onClose={() => setPreviewExercise(null)}
      />
    </>
  )
}

export default function WorkoutPlansPage() {
  const { user } = useAuth()

  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState(null)
  const [deletingPlan, setDeletingPlan] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function loadPlans() {
      if (!user) {
        setPlans([])
        setLoading(false)
        return
      }

      setLoading(true)
      setPageError('')

      const { data, error } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (cancelled) return

      if (error) {
        console.error('[GoldGym] Erro ao carregar fichas:', error)
        setPageError('Não foi possível carregar suas fichas de treino.')
        setPlans([])
      } else {
        setPlans(data || [])
      }

      setLoading(false)
    }

    loadPlans()

    return () => {
      cancelled = true
    }
  }, [user])

  const handleSaved = (savedPlan, isEdit) => {
    if (isEdit) {
      setPlans(previous =>
        previous.map(plan =>
          plan.id === savedPlan.id ? savedPlan : plan
        )
      )
    } else {
      setPlans(previous => [savedPlan, ...previous])
    }
  }

  const handleDelete = async () => {
    if (!deletingPlan || !user) return

    const { error } = await supabase
      .from('workout_plans')
      .delete()
      .eq('id', deletingPlan.id)
      .eq('user_id', user.id)

    if (error) {
      console.error('[GoldGym] Erro ao excluir ficha:', error)
      setPageError('Não foi possível excluir a ficha. Tente novamente.')
      return
    }

    setPlans(previous =>
      previous.filter(plan => plan.id !== deletingPlan.id)
    )
    setDeletingPlan(null)
  }

  const handleDuplicate = async plan => {
    if (!user) return

    const { data, error } = await supabase
      .from('workout_plans')
      .insert({
        user_id: user.id,
        name: `${plan.name} (cópia)`,
        days: plan.days || [],
        exercises: plan.exercises || [],
      })
      .select()
      .single()

    if (error) {
      console.error('[GoldGym] Erro ao duplicar ficha:', error)
      setPageError('Não foi possível duplicar a ficha. Tente novamente.')
      return
    }

    if (data) setPlans(previous => [data, ...previous])
  }

  const filteredPlans =
    selectedDay !== null
      ? plans.filter(plan => plan.days?.includes(selectedDay))
      : plans

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-text">
            Minhas fichas
          </h1>
          <p className="mt-1 text-sm text-brand-sub">
            Organize seus treinos e acompanhe a execução dos exercícios.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => {
            setEditingPlan(null)
            setShowModal(true)
          }}
        >
          <Plus className="h-4 w-4" />
          Nova ficha
        </Button>
      </div>

      {pageError && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-3">
          <p className="text-sm text-red-400">{pageError}</p>
          <button
            type="button"
            onClick={() => setPageError('')}
            className="text-red-400"
            aria-label="Fechar mensagem"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSelectedDay(null)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
            selectedDay === null
              ? 'bg-brand-red text-white'
              : 'btn-secondary'
          }`}
        >
          Todos
        </button>

        {WEEKDAYS.map((day, index) => (
          <button
            key={day}
            type="button"
            onClick={() =>
              setSelectedDay(current => (current === index ? null : index))
            }
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
              selectedDay === index
                ? 'bg-brand-red text-white'
                : 'btn-secondary'
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : filteredPlans.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title={
            selectedDay !== null
              ? `Nenhuma ficha para ${WEEKDAYS_FULL[selectedDay]}`
              : 'Nenhuma ficha criada'
          }
          description={
            selectedDay !== null
              ? 'Crie uma ficha e associe-a a este dia.'
              : 'Crie sua primeira ficha de musculação e adicione exercícios à sua rotina.'
          }
          action={
            <Button
              onClick={() => {
                setEditingPlan(null)
                setShowModal(true)
              }}
            >
              <Plus className="h-4 w-4" />
              Criar ficha
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredPlans.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onEdit={() => {
                setEditingPlan(plan)
                setShowModal(true)
              }}
              onDelete={() => setDeletingPlan(plan)}
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
        open={!!deletingPlan}
        onClose={() => setDeletingPlan(null)}
        onConfirm={handleDelete}
        title="Excluir ficha"
        message={`Tem certeza que deseja excluir a ficha "${deletingPlan?.name || ''}"?`}
        confirmText="Excluir"
      />
    </div>
  )
}