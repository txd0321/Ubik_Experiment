import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ThreeScene from './components/ThreeScene'
import { batchEvents, initSession, submitExperiment, type EventPayload, type Step } from './lib/api'

type Option = {
  id: string
  label: string
  image?: string
}

type ItemQuestion = {
  id: string
  name: string
  question: string
  correctOptionId: string
  options: Option[]
}

type PracticeAnswer = {
  itemId: string
  selectedOptionId: string
  durationMs: number
  isCorrect: boolean
}

type FormalAnswer = {
  itemId: string
  selectedOptionId: string
  durationMs: number
  orderIndex: number
  optionHoverDurationsMs: Record<string, number>
  optionHoverCounts: Record<string, number>
}

type SurveyData = {
  taskDifficulty: string
  coreDifficulties: string[]
  decisionBases: string[]
  noticedEnvironmentChanges: string
  environmentImpact: string
  narrativePresence: string
  feedback: string
}

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
const USER_ID_STORAGE_KEY = 'ubik_user_id'

function getOrCreateUserId() {
  const cached = window.localStorage.getItem(USER_ID_STORAGE_KEY)
  if (cached) return cached
  const next = window.crypto.randomUUID()
  window.localStorage.setItem(USER_ID_STORAGE_KEY, next)
  return next
}

const PRACTICE_QUESTION: ItemQuestion = {
  id: 'practice-cube',
  name: '正方体',
  question: '练习题（单选）：正方体有几个面？',
  correctOptionId: 'D',
  options: [
    { id: 'A', label: 'A. 3个' },
    { id: 'B', label: 'B. 4个' },
    { id: 'C', label: 'C. 5个' },
    { id: 'D', label: 'D. 6个' },
  ],
}

const PRACTICE_FEEDBACK_TEXT = {
  correctTitle: '回答正确',
  correctReason: '正确答案是 D（6个）。',
  wrongTitle: '回答错误',
  wrongReason: '正确答案是 D（6个）。',
}

const FORMAL_ITEMS: ItemQuestion[] = [
  {
    id: 'nano-repair-spray',
    name: '纳米修复喷雾',
    question: '纳米修复喷雾最可能退行成哪一项？',
    correctOptionId: 'B',
    options: [
      { id: 'A', label: 'A. 现代圆柱形运动水壶' },
      { id: 'B', label: 'B. 老式马口铁气雾罐' },
      { id: 'C', label: 'C. 游乐场旋转木马' },
      { id: 'D', label: 'D. 带有发光液体的魔法药水瓶' },
    ],
  },
  {
    id: 'smart-speaker',
    name: '智能音箱',
    question: '智能音箱最可能退行成哪一项？',
    correctOptionId: 'D',
    options: [
      { id: 'A', label: 'A. 现代头戴式无线耳机' },
      { id: 'B', label: 'B. 木质复古相框' },
      { id: 'C', label: 'C. 表面光滑的深灰色圆石' },
      { id: 'D', label: 'D. 大喇叭铜质留声机' },
    ],
  },
  {
    id: 'holographic-projector',
    name: '全息投影仪',
    question: '全息投影仪最可能退行成哪一项？',
    correctOptionId: 'A',
    options: [
      { id: 'A', label: 'A. 收音机' },
      { id: 'B', label: 'B. 铁制家用剪刀' },
      { id: 'C', label: 'C. 现代极简透明玻璃立方体/花瓶' },
      { id: 'D', label: 'D. 宽屏超薄液晶显示器' },
    ],
  },
  {
    id: 'smart-environment-lamp',
    name: '智能环境灯',
    question: '智能环境灯最可能退行成哪一项？',
    correctOptionId: 'B',
    options: [
      { id: 'A', label: 'A. 强光手电筒' },
      { id: 'B', label: 'B. 手提式煤油马灯' },
      { id: 'C', label: 'C. 发光的磨砂白色乒乓球' },
      { id: 'D', label: 'D. 玻璃水杯' },
    ],
  },
  {
    id: 'laptop',
    name: '笔记本电脑',
    question: '笔记本电脑最可能退行成哪一项？',
    correctOptionId: 'B',
    options: [
      { id: 'A', label: 'A. 传统的木框算盘' },
      { id: 'B', label: 'B. 雷明顿机械打字机' },
      { id: 'C', label: 'C. 银色不锈钢咖啡托盘' },
      { id: 'D', label: 'D. 折叠式便携梳妆镜' },
    ],
  },
  {
    id: 'smartphone',
    name: '智能手机',
    question: '智能手机最可能退行成哪一项？',
    correctOptionId: 'A',
    options: [
      { id: 'A', label: 'A. 牛皮纸信封' },
      { id: 'B', label: 'B. 火柴盒' },
      { id: 'C', label: 'C. 陶瓷烟灰缸' },
      { id: 'D', label: 'D. 黑色磨砂石板' },
    ],
  },
  {
    id: 'digital-wallet',
    name: '数字钱包',
    question: '数字钱包最可能退行成哪一项？',
    correctOptionId: 'B',
    options: [
      { id: 'A', label: 'A. 黑色扁平充电宝' },
      { id: 'B', label: 'B. 磨损的皮革钱袋与银币' },
      { id: 'C', label: 'C. 手持雨伞的手柄' },
      { id: 'D', label: 'D. 纸质银行存折' },
    ],
  },
  {
    id: 'smart-coffee-machine',
    name: '智能咖啡机',
    question: '智能咖啡机最可能退行成哪一项？',
    correctOptionId: 'C',
    options: [
      { id: 'A', label: 'A. 金属垃圾桶' },
      { id: 'B', label: 'B. 旧报纸' },
      { id: 'C', label: 'C. 手摇研磨机、炭火铜炉' },
      { id: 'D', label: 'D. 咖啡包装袋' },
    ],
  },
  {
    id: 'smart-air-conditioner',
    name: '智能中央空调',
    question: '智能中央空调最可能退行成哪一项？',
    correctOptionId: 'D',
    options: [
      { id: 'A', label: 'A. 墙上的白色横梁' },
      { id: 'B', label: 'B. 绿色盆栽' },
      { id: 'C', label: 'C. 三叶电风扇' },
      { id: 'D', label: 'D. 铸铁暖气片' },
    ],
  },
  {
    id: 'plasma-lighter',
    name: '电浆打火机',
    question: '电浆打火机最可能退行成哪一项？',
    correctOptionId: 'C',
    options: [
      { id: 'A', label: 'A. 塑料美发梳' },
      { id: 'B', label: 'B. 聚光放大镜' },
      { id: 'C', label: 'C. 木制火柴盒' },
      { id: 'D', label: 'D. 圆柱金属外壳口红' },
    ],
  },
  {
    id: 'smart-toilet',
    name: '智能马桶',
    question: '智能马桶最可能退行成哪一项？',
    correctOptionId: 'B',
    options: [
      { id: 'A', label: 'A. 现代白色陶瓷洗手台' },
      { id: 'B', label: 'B. 搪瓷图案夜壶/痰盂' },
      { id: 'C', label: 'C. 几卷现代卫生纸' },
      { id: 'D', label: 'D. 木质地球仪' },
    ],
  },
  {
    id: 'sonic-toothbrush',
    name: '电动牙刷',
    question: '电动牙刷最可能退行成哪一项？',
    correctOptionId: 'A',
    options: [
      { id: 'A', label: 'A. 猪鬃牙刷与铁盒牙粉' },
      { id: 'B', label: 'B. 塑料软毛牙刷' },
      { id: 'C', label: 'C. 金属螺丝刀' },
      { id: 'D', label: 'D. 白板笔' },
    ],
  },
  {
    id: 'hair-dryer',
    name: '电动吹风机',
    question: '电动吹风机最可能退行成哪一项？',
    correctOptionId: 'C',
    options: [
      { id: 'A', label: 'A. 电直板夹' },
      { id: 'B', label: 'B. 手持金属放大镜' },
      { id: 'C', label: 'C. 老式美发工具组' },
      { id: 'D', label: 'D. 陶瓷咖啡杯' },
    ],
  },
  {
    id: 'smart-shower-system',
    name: '智能淋浴系统',
    question: '智能淋浴系统最可能退行成哪一项？',
    correctOptionId: 'C',
    options: [
      { id: 'A', label: 'A. 圆形顶灯+金属落地灯组合' },
      { id: 'B', label: 'B. 多功能花洒' },
      { id: 'C', label: 'C. 掉漆浴缸+木质水瓢' },
      { id: 'D', label: 'D. 木质吉他' },
    ],
  },
  {
    id: 'smart-washbasin',
    name: '智能盥洗台',
    question: '智能盥洗台最可能退行成哪一项？',
    correctOptionId: 'A',
    options: [
      { id: 'A', label: 'A. 搪瓷洗脸盆+木质洗漱架' },
      { id: 'B', label: 'B. 不锈钢洗碗池' },
      { id: 'C', label: 'C. 纯白办公书桌' },
      { id: 'D', label: 'D. 百科全书' },
    ],
  },
  {
    id: 'smart-refrigerator',
    name: '智能冰箱',
    question: '智能冰箱最可能退行成哪一项？',
    correctOptionId: 'A',
    options: [
      { id: 'A', label: 'A. 老式木质冰柜' },
      { id: 'B', label: 'B. 双开门保险箱' },
      { id: 'C', label: 'C. 智能保温箱' },
      { id: 'D', label: 'D. 落地衣架' },
    ],
  },
  {
    id: 'smart-rice-cooker',
    name: '智能电饭煲',
    question: '智能电饭煲最可能退行成哪一项？',
    correctOptionId: 'D',
    options: [
      { id: 'A', label: 'A. 不锈钢高压锅' },
      { id: 'B', label: 'B. 仙人掌盆栽' },
      { id: 'C', label: 'C. 摩托车头盔' },
      { id: 'D', label: 'D. 铸铁双耳吊锅' },
    ],
  },
  {
    id: 'robot-vacuum-cleaner',
    name: '扫地机器人',
    question: '扫地机器人最可能退行成哪一项？',
    correctOptionId: 'C',
    options: [
      { id: 'A', label: 'A. 圆形玻璃体重秤' },
      { id: 'B', label: 'B. 吸尘器' },
      { id: 'C', label: 'C. 扫帚与簸箕' },
      { id: 'D', label: 'D. 陶瓷餐盘' },
    ],
  },
  {
    id: 'smart-kettle',
    name: '电热水壶',
    question: '电热水壶最可能退行成哪一项？',
    correctOptionId: 'B',
    options: [
      { id: 'A', label: 'A. 保温杯' },
      { id: 'B', label: 'B. 铜制烧水壶' },
      { id: 'C', label: 'C. 铁锤' },
      { id: 'D', label: 'D. 榨汁机' },
    ],
  },
  {
    id: 'microwave-oven',
    name: '微波炉',
    question: '微波炉最可能退行成哪一项？',
    correctOptionId: 'A',
    options: [
      { id: 'A', label: 'A. 柴火炉' },
      { id: 'B', label: 'B. 老式天线电视机' },
      { id: 'C', label: 'C. 小提琴琴盒' },
      { id: 'D', label: 'D. 空气炸锅' },
    ],
  },
]

function shuffleOptions(options: Option[]): Option[] {
  return [...options].sort(() => Math.random() - 0.5)
}

function getInitialStepFromQuery(): Step {
  const query = new URLSearchParams(window.location.search)
  const stepParam = query.get('step')
  const forceAllCompleted = query.get('forceAllCompleted') === '1'
  const previewFormalExit = query.get('previewFormalExit') === '1'

  // 预览参数兜底：未显式传 step 时默认进入 formal
  if (!stepParam && (forceAllCompleted || previewFormalExit)) return 'formal'

  if (stepParam === 'welcome') return 'welcome'
  if (stepParam === 'tutorial') return 'practice'
  if (stepParam === 'practice') return 'practice'
  if (stepParam === 'formal') return 'formal'
  if (stepParam === 'survey') return 'survey'
  return 'welcome'
}

function isFormalExitPreviewEnabled() {
  return new URLSearchParams(window.location.search).get('previewFormalExit') === '1'
}

function isForceAllCompletedEnabled() {
  return new URLSearchParams(window.location.search).get('forceAllCompleted') === '1'
}

function App() {
  const [step, setStep] = useState<Step>(() => getInitialStepFromQuery())
  const [sessionId, setSessionId] = useState('')
  const [userId] = useState(() => getOrCreateUserId())
  const [participantPhone, setParticipantPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState('')

  const [practicePanelOpen, setPracticePanelOpen] = useState(false)
  const [practiceSelected, setPracticeSelected] = useState('')
  const [practiceAnswer, setPracticeAnswer] = useState<PracticeAnswer | null>(null)
  const [showPracticeFeedback, setShowPracticeFeedback] = useState(false)
  const [showEnterFormalButton, setShowEnterFormalButton] = useState(false)
  const [practiceFeedbackShownAt, setPracticeFeedbackShownAt] = useState<number | null>(null)
  const [practiceActiveItemIds, setPracticeActiveItemIds] = useState<string[]>([])

  const [formalPanelItem, setFormalPanelItem] = useState<ItemQuestion | null>(null)
  const [formalSelected, setFormalSelected] = useState('')
  const [formalAnswers, setFormalAnswers] = useState<FormalAnswer[]>([])
  const [formalCompleted, setFormalCompleted] = useState(false)
  const [showFormalExitButton, setShowFormalExitButton] = useState(() => isFormalExitPreviewEnabled())
  const [forceAllCompletedPreview] = useState(() => isForceAllCompletedEnabled())

  const [surveyData, setSurveyData] = useState<SurveyData>({
    taskDifficulty: '',
    coreDifficulties: [],
    decisionBases: [],
    noticedEnvironmentChanges: '',
    environmentImpact: '',
    narrativePresence: '',
    feedback: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [surveyQuestionDurationsMs, setSurveyQuestionDurationsMs] = useState<Record<string, number>>({})

  const [position, setPosition] = useState({ x: 0, z: 0 })
  const [nowMs, setNowMs] = useState(Date.now())
  const [formalDurationMs, setFormalDurationMs] = useState(0)

  const eventsRef = useRef<EventPayload[]>([])
  const practiceFeedbackTimerRef = useRef<number | null>(null)
  const experimentStartAtRef = useRef<number>(0)
  const panelOpenAtRef = useRef<number>(0)
  const formalOrderRef = useRef<number>(0)
  const surveyQuestionOpenAtRef = useRef<Record<string, number>>({})
  const formalStepStartedAtRef = useRef<number>(0)
  const formalOptionHoverStartRef = useRef<Record<string, number>>({})
  const formalOptionHoverDurationsRef = useRef<Record<string, number>>({})
  const formalOptionHoverCountsRef = useRef<Record<string, number>>({})

  const formalAnsweredIds = useMemo(
    () => new Set(formalAnswers.map((a) => a.itemId)),
    [formalAnswers],
  )

  const formalOptionMap = useMemo(() => {
    return new Map(FORMAL_ITEMS.map((item) => [item.id, shuffleOptions(item.options)]))
  }, [])

  const track = (eventName: string, payload?: Record<string, unknown>) => {
    if (!sessionId) return
    eventsRef.current.push({
      event_id: uid(),
      event_name: eventName,
      event_time: new Date().toISOString(),
      step,
      session_id: sessionId,
      page_url: window.location.pathname,
      payload,
    })
  }

  const flushEvents = async () => {
    if (eventsRef.current.length === 0) return
    const batch = [...eventsRef.current]
    eventsRef.current = []
    try {
      await batchEvents(batch)
    } catch {
      eventsRef.current = [...batch, ...eventsRef.current]
    }
  }

  useEffect(() => {
    void (async () => {
      const session = await initSession(userId)
      setSessionId(session.sessionId)
    })()
  }, [userId])

  useEffect(() => {
    const timer = window.setInterval(() => {
      void flushEvents()
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const beforeUnload = () => {
      void flushEvents()
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [])

  useEffect(() => {
    if (!sessionId) return
    track(`${step}_view`)
    if (step === 'practice') {
      track('tutorial_view')
      track('practice_scene_loaded')
    }
    if (step === 'formal') {
      formalStepStartedAtRef.current = Date.now()
      setFormalCompleted(forceAllCompletedPreview)
      setShowFormalExitButton(isFormalExitPreviewEnabled() || forceAllCompletedPreview)
      track('formal_scene_loaded')

      if (forceAllCompletedPreview) {
        track('formal_all_completed')
        track('formal_environment_transition_started')
        window.setTimeout(() => {
          track('formal_environment_transition_finished')
        }, 2000)
      }
    }
  }, [sessionId, step])


  useEffect(() => {
    if (step !== 'survey') return
    const openedAt = Date.now()
    surveyQuestionOpenAtRef.current = {
      taskDifficulty: openedAt,
      coreDifficulties: openedAt,
      decisionBases: openedAt,
      noticedEnvironmentChanges: openedAt,
      environmentImpact: openedAt,
      narrativePresence: openedAt,
      feedback: openedAt,
    }
    setSurveyQuestionDurationsMs({})
  }, [step])


  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now()
      setNowMs(now)
      if (step === 'formal' && formalStepStartedAtRef.current) {
        setFormalDurationMs(now - formalStepStartedAtRef.current)
      }
    }, 200)
    return () => clearInterval(timer)
  }, [step])

  useEffect(() => {
    return () => {
      if (practiceFeedbackTimerRef.current) {
        window.clearTimeout(practiceFeedbackTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (step !== 'practice' && step !== 'formal') return
    const listener = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (!['w', 'a', 's', 'd'].includes(key)) return
      setPosition((prev) => {
        const delta = 1
        if (key === 'w') return { ...prev, z: prev.z - delta }
        if (key === 's') return { ...prev, z: prev.z + delta }
        if (key === 'a') return { ...prev, x: prev.x - delta }
        return { ...prev, x: prev.x + delta }
      })
      track('movement_key_press', { key })
    }
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [step, sessionId])

  useEffect(() => {
    if (step !== 'formal' || !sessionId) return
    const timer = window.setInterval(() => {
      track('formal_path_tick', {
        ts: Date.now(),
        camera_position: { x: position.x, y: 0, z: position.z },
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [step, sessionId, position.x, position.z])

  const goToStep = (next: Step) => {
    setLoading(true)
    setTimeout(() => {
      setStep(next)
      setLoading(false)
    }, 500)
  }

  const openPracticePanel = useCallback(() => {
    setPracticePanelOpen(true)
    setPracticeSelected('')
    setPracticeAnswer(null)
    setShowPracticeFeedback(false)
    setShowEnterFormalButton(false)
    setPracticeFeedbackShownAt(null)
    if (practiceFeedbackTimerRef.current) {
      window.clearTimeout(practiceFeedbackTimerRef.current)
      practiceFeedbackTimerRef.current = null
    }
    panelOpenAtRef.current = Date.now()
    track('practice_object_clicked', { itemId: PRACTICE_QUESTION.id })
  }, [sessionId, step])

  const closePracticePanel = () => {
    if (practiceFeedbackTimerRef.current) {
      window.clearTimeout(practiceFeedbackTimerRef.current)
      practiceFeedbackTimerRef.current = null
    }
    setPracticePanelOpen(false)
    setPracticeSelected('')
    setShowPracticeFeedback(false)
    setShowEnterFormalButton(false)
    setPracticeFeedbackShownAt(null)
    track('practice_panel_closed')
  }

  const submitPractice = () => {
    if (!practiceSelected) return
    const isCorrect = practiceSelected === PRACTICE_QUESTION.correctOptionId
    const answer: PracticeAnswer = {
      itemId: PRACTICE_QUESTION.id,
      selectedOptionId: practiceSelected,
      isCorrect,
      durationMs: Date.now() - panelOpenAtRef.current,
    }
    setPracticeAnswer(answer)
    setShowPracticeFeedback(true)
    setShowEnterFormalButton(false)
    setPracticeFeedbackShownAt(Date.now())
    track('practice_answer_submitted', {
      itemId: answer.itemId,
      selectedOptionId: answer.selectedOptionId,
      isCorrect: answer.isCorrect,
      durationMs: answer.durationMs,
    })
    track('practice_feedback_shown', {
      itemId: answer.itemId,
      isCorrect: answer.isCorrect,
    })

    if (practiceFeedbackTimerRef.current) {
      window.clearTimeout(practiceFeedbackTimerRef.current)
    }
    practiceFeedbackTimerRef.current = window.setTimeout(() => {
      setShowEnterFormalButton(true)
    }, 3000)
  }

  const enterFormal = () => {
    if (practiceFeedbackTimerRef.current) {
      window.clearTimeout(practiceFeedbackTimerRef.current)
      practiceFeedbackTimerRef.current = null
    }
    experimentStartAtRef.current = Date.now()
    goToStep('formal')
    track('enter_formal_experiment_click')
  }

  const openFormalPanel = useCallback(
    (item: ItemQuestion) => {
      if (formalAnsweredIds.has(item.id)) return
      setFormalPanelItem(item)
      setFormalSelected('')
      formalOptionHoverStartRef.current = {}
      formalOptionHoverDurationsRef.current = {}
      formalOptionHoverCountsRef.current = {}
      panelOpenAtRef.current = Date.now()
      track('formal_object_clicked', { itemId: item.id })
      track('formal_question_opened', { itemId: item.id, questionOpenedAt: panelOpenAtRef.current })
    },
    [formalAnsweredIds, sessionId, step],
  )

  const closeFormalPanel = () => {
    if (!formalPanelItem) return

    const now = Date.now()
    Object.entries(formalOptionHoverStartRef.current).forEach(([optionId, startedAt]) => {
      if (!startedAt) return
      const duration = now - startedAt
      formalOptionHoverDurationsRef.current[optionId] =
        (formalOptionHoverDurationsRef.current[optionId] ?? 0) + duration
    })
    formalOptionHoverStartRef.current = {}

    track('formal_question_closed', {
      itemId: formalPanelItem.id,
      openedDurationMs: now - panelOpenAtRef.current,
      optionHoverDurationsMs: { ...formalOptionHoverDurationsRef.current },
      optionHoverCounts: { ...formalOptionHoverCountsRef.current },
    })

    formalOptionHoverDurationsRef.current = {}
    formalOptionHoverCountsRef.current = {}
    setFormalSelected('')
    setFormalPanelItem(null)
  }

  const submitFormal = () => {
    if (!formalPanelItem || !formalSelected) return

    const now = Date.now()
    Object.entries(formalOptionHoverStartRef.current).forEach(([optionId, startedAt]) => {
      if (!startedAt) return
      const duration = now - startedAt
      formalOptionHoverDurationsRef.current[optionId] =
        (formalOptionHoverDurationsRef.current[optionId] ?? 0) + duration
    })
    formalOptionHoverStartRef.current = {}

    formalOrderRef.current += 1
    const answer: FormalAnswer = {
      itemId: formalPanelItem.id,
      selectedOptionId: formalSelected,
      durationMs: now - panelOpenAtRef.current,
      orderIndex: formalOrderRef.current,
      optionHoverDurationsMs: { ...formalOptionHoverDurationsRef.current },
      optionHoverCounts: { ...formalOptionHoverCountsRef.current },
    }
    const nextAnswers = [...formalAnswers, answer]
    setFormalAnswers(nextAnswers)
    setFormalPanelItem(null)
    track('formal_answer_submitted', {
      itemId: answer.itemId,
      selectedOptionId: answer.selectedOptionId,
      durationMs: answer.durationMs,
      orderIndex: answer.orderIndex,
      optionHoverDurationsMs: answer.optionHoverDurationsMs,
      optionHoverCounts: answer.optionHoverCounts,
    })

    formalOptionHoverDurationsRef.current = {}
    formalOptionHoverCountsRef.current = {}

    if (nextAnswers.length === FORMAL_ITEMS.length) {
      setFormalCompleted(true)
      track('formal_all_completed')
      track('formal_environment_transition_started')
      window.setTimeout(() => {
        track('formal_environment_transition_finished')
        setShowFormalExitButton(true)
      }, 2000)
    }
  }

  const markSurveyAnswered = (questionKey: keyof SurveyData) => {
    const openedAt = surveyQuestionOpenAtRef.current[questionKey]
    if (!openedAt) return
    setSurveyQuestionDurationsMs((prev) => {
      if (prev[questionKey]) return prev
      return {
        ...prev,
        [questionKey]: Date.now() - openedAt,
      }
    })
  }

  const surveyValid =
    Boolean(surveyData.taskDifficulty) &&
    surveyData.coreDifficulties.length > 0 &&
    surveyData.decisionBases.length > 0 &&
    Boolean(surveyData.noticedEnvironmentChanges) &&
    (surveyData.noticedEnvironmentChanges === '否' || Boolean(surveyData.environmentImpact.trim())) &&
    Boolean(surveyData.narrativePresence)

  const submitSurvey = async () => {
    if (!surveyValid || submitting) return
    setSubmitting(true)
    track('survey_submit_click')

    const payload = {
      sessionId,
      userId,
      totalDurationMs: Date.now() - experimentStartAtRef.current,
      practiceAnswer,
      formalAnswers,
      surveyData,
      surveyQuestionDurationsMs,
      eventBufferLength: eventsRef.current.length,
    }

    try {
      await flushEvents()
      await submitExperiment(payload)
      track('survey_submit_success')
      setSubmitSuccess(true)
      setToast('提交成功！再次感谢您的参与！')
    } catch {
      track('survey_submit_failed')
      setToast('提交失败，请检查网络后重试')
    } finally {
      setSubmitting(false)
    }
  }

  const practiceSceneItems = useMemo(
    () => [
      {
        id: PRACTICE_QUESTION.id,
        name: PRACTICE_QUESTION.name,
        answered: false,
        slotOverride: 14,
      },
    ],
    [],
  )

  const formalSceneItems = useMemo(
    () => {
      const slotOverrides: Record<string, number> = {
        // 卧室（1-10）
        'nano-repair-spray': 9,
        'smart-speaker': 7,
        // 03：A/B 视为同一交互物体，这里用 A 的槽位作为交互点
        'holographic-projector': 16,
        'smart-environment-lamp': 17,
        laptop: 6,
        smartphone: 5,
        'digital-wallet': 3,
        'smart-coffee-machine': 1,
        'smart-air-conditioner': 0,
        'plasma-lighter': 14,
        // 厕所（11-15）
        'smart-toilet': 18,
        'sonic-toothbrush': 19,
        'hair-dryer': 20,
        'smart-shower-system': 21,
        'smart-washbasin': 22,
        // 厨房（16-20）
        'smart-refrigerator': 23,
        'smart-rice-cooker': 24,
        'robot-vacuum-cleaner': 25,
        'smart-kettle': 26,
        'microwave-oven': 27,
      }

      const mainItems = FORMAL_ITEMS.map((item) => ({
        id: item.id,
        name: item.name,
        answered: formalAnsweredIds.has(item.id),
        slotOverride: slotOverrides[item.id],
      }))

      // 03 题特殊规则：A/B 两个 2030 投影模型共用同一题，完成后二者同时退场，仅保留一个 1930 radio
      mainItems.push({
        id: 'holographic-projector-buddy',
        name: '全息投影仪（B）',
        answered: formalAnsweredIds.has('holographic-projector'),
        slotOverride: 15,
      })

      // PRD 248-269：nonitr 需在场景中展示，并在全完成后切换到 1930
      const nonInteractiveAnswered = forceAllCompletedPreview || formalCompleted
      mainItems.push(
        // 卧室 nonitr（1-7）
        {
          id: 'bedroom-nonitr-01',
          name: '卧室非交互：桌子',
          answered: nonInteractiveAnswered,
          slotOverride: 8,
        },
        {
          id: 'bedroom-nonitr-02',
          name: '卧室非交互：床',
          answered: nonInteractiveAnswered,
          slotOverride: 12,
        },
        {
          id: 'bedroom-nonitr-03',
          name: '卧室非交互：茶几',
          answered: nonInteractiveAnswered,
          slotOverride: 13,
        },
        {
          id: 'bedroom-nonitr-04',
          name: '卧室非交互：椅子',
          answered: nonInteractiveAnswered,
          slotOverride: 10,
        },
        {
          id: 'bedroom-nonitr-05',
          name: '卧室非交互：沙发',
          answered: nonInteractiveAnswered,
          slotOverride: 11,
        },
        {
          id: 'bedroom-nonitr-06',
          name: '卧室非交互：前门',
          answered: nonInteractiveAnswered,
          slotOverride: 4,
        },
        {
          id: 'bedroom-nonitr-07',
          name: '卧室非交互：盆栽',
          answered: nonInteractiveAnswered,
          slotOverride: 2,
        },
        // 厨房 nonitr（8-9）
        {
          id: 'kitchen-nonitr-08',
          name: '厨房非交互：橱柜烟囱',
          answered: nonInteractiveAnswered,
          slotOverride: 28,
        },
        {
          id: 'kitchen-nonitr-09',
          name: '厨房非交互：窗户',
          answered: nonInteractiveAnswered,
          slotOverride: 29,
        },
      )

      return mainItems
    },
    [formalAnsweredIds, formalCompleted, forceAllCompletedPreview],
  )

  const handlePracticeItemClick = useCallback(() => {
    openPracticePanel()
  }, [])

  const handleFormalItemClick = useCallback((itemId: string) => {
    const normalizedItemId = itemId === 'holographic-projector-buddy' ? 'holographic-projector' : itemId
    const item = FORMAL_ITEMS.find((it) => it.id === normalizedItemId)
    if (!item) return
    openFormalPanel(item)
  }, [formalAnsweredIds])

  const handleFormalOptionHoverStart = (optionId: string) => {
    if (!formalPanelItem) return
    if (formalOptionHoverStartRef.current[optionId]) return
    formalOptionHoverStartRef.current[optionId] = Date.now()
    formalOptionHoverCountsRef.current[optionId] = (formalOptionHoverCountsRef.current[optionId] ?? 0) + 1
    track('formal_option_hover_start', { itemId: formalPanelItem.id, optionId })
  }

  const handleFormalOptionHoverEnd = (optionId: string) => {
    if (!formalPanelItem) return
    const startedAt = formalOptionHoverStartRef.current[optionId]
    if (!startedAt) return
    const duration = Date.now() - startedAt
    formalOptionHoverDurationsRef.current[optionId] =
      (formalOptionHoverDurationsRef.current[optionId] ?? 0) + duration
    delete formalOptionHoverStartRef.current[optionId]
    track('formal_option_hover_end', { itemId: formalPanelItem.id, optionId, durationMs: duration })
  }

  const exitFormalToSurvey = () => {
    const endedAt = Date.now()
    const durationMs = formalStepStartedAtRef.current ? endedAt - formalStepStartedAtRef.current : 0
    track('formal_exit_experiment_click', {
      formalStartedAt: formalStepStartedAtRef.current,
      formalEndedAt: endedAt,
      formalDurationMs: durationMs,
    })
    goToStep('survey')
  }

  const isSceneStep = step === 'practice' || step === 'formal'


  const navSteps = [
    { key: 'consent', label: 'Step 0 知情同意' },
    { key: 'tutorial', label: 'Step 1 操作教学' },
    { key: 'formal', label: 'Step 2 正式试验' },
    { key: 'survey', label: 'Step 3 问卷与反馈' },
    { key: 'thanks', label: '☑️谢谢参与' },
  ] as const

  const activeNavStepKey = submitSuccess
    ? 'thanks'
    : step === 'welcome'
      ? 'consent'
      : step === 'practice' || step === 'tutorial'
        ? 'tutorial'
        : step === 'formal'
          ? 'formal'
          : 'survey'

  return (
    <div className={isSceneStep ? 'app-shell app-shell--scene' : 'app-shell'}>
      <header className={isSceneStep ? 'global-nav global-nav--overlay' : 'global-nav'}>
        <div className="global-nav__brand">Ubik Experiment</div>
        <nav className="global-nav__steps" aria-label="实验步骤导航">
          {navSteps.map((item, index) => (
            <div key={item.key} className="global-nav__step-item-wrap">
              <span className={item.key === activeNavStepKey ? 'global-nav__step-item active' : 'global-nav__step-item'}>
                {item.label}
                {item.key === 'formal' && step === 'formal' && (
                  <span className="global-nav__progress">（{formalAnswers.length}/{FORMAL_ITEMS.length}）</span>
                )}
              </span>
              {index < navSteps.length - 1 && <span className="global-nav__step-sep">----</span>}
            </div>
          ))}
        </nav>
      </header>

      {loading && <div className="loading">加载中，请稍候...</div>}

      {!loading && step === 'welcome' && (
        <section className="panel hero">
          <h2>尤比克退行认知匹配实验</h2>
          <p className="hero-intro">
            在著名科幻作家菲利普迪克所著小说《尤比克》的世界观中，现代物品会“退行”为1930年代在功能上对应的物品，你将进入
            2030现代客厅并完成 10 道判断题。
          </p>

          <label className="phone-input-row">
            <span>填写用户ID：请填写你的电话号码</span>
            <input
              type="tel"
              inputMode="numeric"
              placeholder="请输入电话号码"
              value={participantPhone}
              onChange={(e) => {
                const nextValue = e.target.value.replace(/[^\d]/g, '').slice(0, 20)
                setParticipantPhone(nextValue)
              }}
            />
          </label>

          <button
            className="start-btn"
            disabled={!participantPhone}
            onClick={() => {
              track('start_experiment_click', { participantPhone })
              goToStep('practice')
            }}
          >
            开始
          </button>
        </section>
      )}

      {!loading && step === 'practice' && (
        <section className="scene-wrap">
          {!practicePanelOpen && (
            <div className="scene-overlay-top scene-overlay-top--tutorial">
              <div>
                <p>键盘W,A, S, D 可控制前后左右移动，鼠标可控制视角</p>
              </div>
            </div>
          )}

          <div className="scene scene--practice">
            {!practicePanelOpen && (
              <div className="scene-hud scene-hud--practice">
                <span>
                  {practiceActiveItemIds.length > 0
                    ? '请点击物体'
                    : '请靠近物体直到物体发光'}
                </span>
              </div>
            )}
            <ThreeScene
              items={practiceSceneItems}
              onItemClick={handlePracticeItemClick}
              onActiveItemsChange={setPracticeActiveItemIds}
              scenePreset="practice"
              interactionLocked={practicePanelOpen}
              renderUnusedSlots={false}
              initialCameraPosition={[-1.5, 2.4, 5.6]}
              initialTarget={[-3.2, 1.25, 3.5]}
            />
          </div>

          {practicePanelOpen && (
            <div className="qa-panel qa-panel--practice">
              <button className="qa-panel-close" onClick={closePracticePanel} aria-label="关闭答题卡">
                ×
              </button>
              {showEnterFormalButton ? (
                <>
                  <h3 className="practice-finish-title">恭喜完成操作教学环节！</h3>
                  <div className="bottom-action bottom-action--in-panel">
                    <button onClick={enterFormal}>进入正式实验</button>
                  </div>
                </>
              ) : (
                <>
                  {!showPracticeFeedback && (
                    <>
                      <div className="qa-panel-meta">练习题（单题）</div>
                      <h3>{PRACTICE_QUESTION.question}</h3>
                      <div className="options-grid">
                        {PRACTICE_QUESTION.options.map((opt) => (
                          <button
                            key={opt.id}
                            className={practiceSelected === opt.id ? 'opt selected' : 'opt'}
                            onClick={() => {
                              setPracticeSelected(opt.id)
                              track('practice_option_selected', { optionId: opt.id })
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      <button disabled={!practiceSelected} onClick={submitPractice}>
                        确认选择
                      </button>
                    </>
                  )}

                  {showPracticeFeedback && practiceAnswer && (
                    <div className={practiceAnswer.isCorrect ? 'feedback feedback--correct' : 'feedback feedback--wrong'}>
                      <strong>
                        {practiceAnswer.isCorrect
                          ? PRACTICE_FEEDBACK_TEXT.correctTitle
                          : PRACTICE_FEEDBACK_TEXT.wrongTitle}
                      </strong>
                      <p>
                        {practiceAnswer.isCorrect
                          ? PRACTICE_FEEDBACK_TEXT.correctReason
                          : PRACTICE_FEEDBACK_TEXT.wrongReason}
                      </p>
                    </div>
                  )}

                  {showPracticeFeedback && !showEnterFormalButton && practiceFeedbackShownAt && (
                    <div className="practice-delay-tip">
                      {Math.max(0, 3 - Math.floor((nowMs - practiceFeedbackShownAt) / 1000))} 秒后可进入正式实验
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </section>
      )}

      {!loading && step === 'formal' && (
        <section className="scene-wrap">
          <div className="scene-overlay-top scene-overlay-top--formal">
            <div className="scene-top-actions">
              <div className="counter counter--overlay">{formalAnswers.length}/{FORMAL_ITEMS.length} 已完成</div>
              {showFormalExitButton ? (
                <button className="ghost-btn ghost-btn--formal-exit" onClick={exitFormalToSurvey}>
                  退出实验
                </button>
              ) : (
                <span className="ghost-btn ghost-btn--formal-exit-tip" style={{ opacity: 0.7, pointerEvents: 'none' }}>
                  完成全部题目后可退出
                </span>
              )}
            </div>
          </div>

          <div className="scene">
            <div className="scene-hud">
              <span>
                坐标 X:{position.x} Z:{position.z}
              </span>
              <span>本阶段已进行：{Math.floor(formalDurationMs / 1000)}s</span>
              <span>自由移动并点击发光物品作答</span>
            </div>
            <ThreeScene
              items={formalSceneItems}
              onItemClick={handleFormalItemClick}
              interactionLocked={Boolean(formalPanelItem)}
              initialCameraPosition={[7, 5, -7]}
              initialTarget={[7, 5, -2]}
            />
          </div>

          {formalCompleted && !showFormalExitButton && !formalPanelItem && (
            <div className="qa-panel">
              <h3>恭喜你已完成所有任务</h3>
              <p>场景正在从 2030 过渡到 1930，请稍候...</p>
            </div>
          )}

          {formalPanelItem && (
            <div className="qa-panel">
              <button className="qa-panel-close" onClick={closeFormalPanel} aria-label="关闭答题卡">
                ×
              </button>
              <h3>{formalPanelItem.question}</h3>
              <div className="options-grid">
                {(formalOptionMap.get(formalPanelItem.id) ?? formalPanelItem.options).map((opt) => (
                  <button
                    key={opt.id}
                    className={formalSelected === opt.id ? 'opt selected' : 'opt'}
                    onMouseEnter={() => handleFormalOptionHoverStart(opt.id)}
                    onMouseLeave={() => handleFormalOptionHoverEnd(opt.id)}
                    onClick={() => {
                      setFormalSelected(opt.id)
                      track('formal_option_selected', {
                        itemId: formalPanelItem.id,
                        optionId: opt.id,
                      })
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <button disabled={!formalSelected} onClick={submitFormal}>
                确认选择
              </button>
            </div>
          )}
        </section>
      )}

      {!loading && step === 'survey' && !submitSuccess && (
        <section className="panel survey">
          <h2>实验完成！感谢你的参与！</h2>
          <p className="survey-intro">针对你刚才交互过的 10 组物品，请根据实际感受打分。</p>

          <label>
            1. 回顾刚才的交互过程，请评估各物品“退行判断”的整体难度（1-7分）
            <select
              value={surveyData.taskDifficulty}
              onChange={(e) => {
                markSurveyAnswered('taskDifficulty')
                setSurveyData((prev) => ({ ...prev, taskDifficulty: e.target.value }))
              }}
            >
              <option value="">请选择</option>
              {[1, 2, 3, 4, 5, 6, 7].map((score) => (
                <option key={score} value={String(score)}>
                  {score}
                </option>
              ))}
            </select>
          </label>

          <fieldset>
            <legend>2. 对于你认为难度 ≥5 分的物品，主要困难来源于？（可多选）</legend>
            {[
              '视觉干扰项（如形状、颜色）非常有迷惑性',
              '难以联想到100年前对应功能的物理实体（逻辑跨度大）',
              '不确定《尤比克》世界观下的演变规则',
              '选项中没有我认为完全合理的答案',
            ].map((item) => (
              <label key={item} className="radio-line">
                <input
                  type="checkbox"
                  checked={surveyData.coreDifficulties.includes(item)}
                  onChange={(e) => {
                    markSurveyAnswered('coreDifficulties')
                    setSurveyData((prev) => ({
                      ...prev,
                      coreDifficulties: e.target.checked
                        ? [...prev.coreDifficulties, item]
                        : prev.coreDifficulties.filter((v) => v !== item),
                    }))
                  }}
                />
                {item}
              </label>
            ))}
          </fieldset>

          <fieldset>
            <legend>3. 你在判断“应该退化成什么”时，最主要依据是？（可多选）</legend>
            {[
              '视觉匹配（形状、材质、空间比例）',
              '功能外推（用途一致但技术层级属于旧时代）',
              '原著记忆（《尤比克》情节或设定）',
              '直觉驱动（第一反应）',
            ].map((item) => (
              <label key={item} className="radio-line">
                <input
                  type="checkbox"
                  checked={surveyData.decisionBases.includes(item)}
                  onChange={(e) => {
                    markSurveyAnswered('decisionBases')
                    setSurveyData((prev) => ({
                      ...prev,
                      decisionBases: e.target.checked
                        ? [...prev.decisionBases, item]
                        : prev.decisionBases.filter((v) => v !== item),
                    }))
                  }}
                />
                {item}
              </label>
            ))}
          </fieldset>

          <fieldset>
            <legend>4. 你是否察觉到环境中其他细节变化（如灯光、噪声、墙面等）？</legend>
            {['是', '否'].map((item) => (
              <label key={item} className="radio-line">
                <input
                  type="radio"
                  name="noticedEnvironmentChanges"
                  checked={surveyData.noticedEnvironmentChanges === item}
                  onChange={() => {
                    markSurveyAnswered('noticedEnvironmentChanges')
                    setSurveyData((prev) => ({ ...prev, noticedEnvironmentChanges: item }))
                  }}
                />
                {item}
              </label>
            ))}
          </fieldset>

          {surveyData.noticedEnvironmentChanges === '是' && (
            <label>
              若选择“是”，请简述这些变化是否增强了你对“退行逻辑”的理解或影响了你的决策
              <textarea
                maxLength={500}
                value={surveyData.environmentImpact}
                onChange={(e) => {
                  markSurveyAnswered('environmentImpact')
                  setSurveyData((prev) => ({ ...prev, environmentImpact: e.target.value }))
                }}
                rows={4}
                placeholder="请输入你的说明"
              />
            </label>
          )}

          <label>
            5. 你多大程度“进入”了这个正在崩塌的《尤比克》虚拟世界？（1-7分）
            <select
              value={surveyData.narrativePresence}
              onChange={(e) => {
                markSurveyAnswered('narrativePresence')
                setSurveyData((prev) => ({ ...prev, narrativePresence: e.target.value }))
              }}
            >
              <option value="">请选择</option>
              {[1, 2, 3, 4, 5, 6, 7].map((score) => (
                <option key={score} value={String(score)}>
                  {score}
                </option>
              ))}
            </select>
          </label>

          <label>
            6. 请问您对本次试验有什么建议（选填）
            <textarea
              maxLength={500}
              value={surveyData.feedback}
              onChange={(e) => {
                markSurveyAnswered('feedback')
                setSurveyData((prev) => ({ ...prev, feedback: e.target.value }))
              }}
              rows={5}
              placeholder="请输入你的建议"
            />
          </label>

          <button className="survey-submit-btn" disabled={!surveyValid || submitting} onClick={() => void submitSurvey()}>
            {submitting ? '提交中...' : '提交问卷'}
          </button>
        </section>
      )}

      {!loading && step === 'survey' && submitSuccess && (
        <section className="survey-success-only">
          <h2>提交成功！再次感谢您的参与！</h2>
        </section>
      )}

      {toast && !submitSuccess && <div className="toast">{toast}</div>}
    </div>
  )
}

export default App
