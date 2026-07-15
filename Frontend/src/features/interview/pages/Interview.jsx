import React, { useState, useEffect } from 'react'
import '../style/interview.scss'
import { useInterview } from '../hooks/useInterview'
import { useNavigate, useParams } from 'react-router'

const NAV_ITEMS = [
    {
        id: 'technical',
        label: 'Technical questions',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
            </svg>
        ),
    },
    {
        id: 'behavioral',
        label: 'Behavioral questions',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
        ),
    },
    {
        id: 'roadmap',
        label: 'Road map',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="3 11 22 2 13 21 11 13 3 11" />
            </svg>
        ),
    },
]

// ── Question Card ─────────────────────────────────────────────────────────────
const QuestionCard = ({ item, index }) => {
    const [open, setOpen] = useState(false)

    return (
        <div className='q-card'>
            <div className='q-card__header' onClick={() => setOpen(o => !o)}>
                <span className='q-card__index'>Q{index + 1}</span>
                <p className='q-card__question'>{item.question}</p>
                <span className={`q-card__chevron ${open ? 'q-card__chevron--open' : ''}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </span>
            </div>

            {open && (
                <div className='q-card__body'>
                    <div className='q-card__block q-card__block--intention'>
                        <span className='q-card__block-label'>Intention</span>
                        <p>{item.intention}</p>
                    </div>
                    <div className='q-card__block q-card__block--answer'>
                        <span className='q-card__block-label'>Model answer</span>
                        <p>{item.answer}</p>
                    </div>
                </div>
            )}
        </div>
    )
}

// ── Road Map Day ──────────────────────────────────────────────────────────────
const RoadMapDay = ({ day }) => (
    <div className='roadmap-day'>
        <div className='roadmap-day__header'>
            <span className='roadmap-day__badge'>Day {day.day}</span>
            <h3 className='roadmap-day__focus'>{day.focus}</h3>
        </div>
        <ul className='roadmap-day__tasks'>
            {day.tasks.map((task, i) => (
                <li key={i}>
                    <span className='roadmap-day__bullet' aria-hidden="true" />
                    {task}
                </li>
            ))}
        </ul>
    </div>
)

// ── Main Component ────────────────────────────────────────────────────────────
const Interview = () => {
    const [activeNav, setActiveNav] = useState('technical')
    const { report, getReportById, loading, getResumePdf } = useInterview()
    const { interviewId } = useParams()

    useEffect(() => {
        if (interviewId) getReportById(interviewId)
    }, [interviewId])

    if (loading || !report) {
        return (
            <div className='loading-screen'>
                <p>Loading your interview plan…</p>
            </div>
        )
    }

    const scoreClass =
        report.matchScore >= 80 ? 'score--high' :
            report.matchScore >= 60 ? 'score--mid' : 'score--low'

    const scoreLabel =
        report.matchScore >= 80 ? 'Strong match' :
            report.matchScore >= 60 ? 'Good match' : 'Needs work'

    const activeItem = NAV_ITEMS.find(n => n.id === activeNav)
    const activeCount =
        activeNav === 'technical' ? report.technicalQuestions.length :
            activeNav === 'behavioral' ? report.behavioralQuestions.length :
                report.preparationPlan.length

    const countLabel =
        activeNav === 'roadmap'
            ? `${activeCount}-day plan`
            : `${activeCount} questions`

    return (
        <div className='interview-page'>
            <div className='interview-layout'>

                {/* ── Left Nav ── */}
                <nav className='interview-nav'>
                    <div className='interview-nav__top'>
                        <div className='interview-nav__job-title'>{report.title}</div>
                        <div className='interview-nav__company'>
                            {new Date(report.createdAt).toLocaleDateString('en-GB', {
                                day: 'numeric', month: 'short', year: 'numeric'
                            })}
                        </div>
                    </div>

                    <div className='interview-nav__hr' />
                    <p className='interview-nav__label'>Sections</p>

                    <div className='interview-nav__items'>
                        {NAV_ITEMS.map(item => (
                            <button
                                key={item.id}
                                className={`interview-nav__item ${activeNav === item.id ? 'interview-nav__item--active' : ''}`}
                                onClick={() => setActiveNav(item.id)}
                            >
                                <span className='interview-nav__icon'>{item.icon}</span>
                                {item.label}
                                <span className='interview-nav__count'>
                                    {item.id === 'technical' ? report.technicalQuestions.length :
                                        item.id === 'behavioral' ? report.behavioralQuestions.length :
                                            report.preparationPlan.length}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className='interview-nav__bottom'>
                        <button
                            className='download-btn'
                            onClick={() => getResumePdf(interviewId)}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Download resume
                        </button>
                    </div>
                </nav>

                <div className='interview-divider' />

                {/* ── Center Content ── */}
                <div className='interview-content'>
                    <div className='content-header'>
                        <h2>{activeItem?.label}</h2>
                        <span className='content-header__count'>{countLabel}</span>
                    </div>

                    <div className='content-body'>
                        {activeNav === 'technical' && (
                            <div className='q-list'>
                                {report.technicalQuestions.map((q, i) => (
                                    <QuestionCard key={i} item={q} index={i} />
                                ))}
                            </div>
                        )}

                        {activeNav === 'behavioral' && (
                            <div className='q-list'>
                                {report.behavioralQuestions.map((q, i) => (
                                    <QuestionCard key={i} item={q} index={i} />
                                ))}
                            </div>
                        )}

                        {activeNav === 'roadmap' && (
                            <div className='roadmap-list'>
                                {report.preparationPlan.map(day => (
                                    <RoadMapDay key={day.day} day={day} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className='interview-divider' />

                {/* ── Right Sidebar ── */}
                <aside className='interview-sidebar'>

                    {/* Match Score */}
                    <div className='sidebar-section'>
                        <p className='sidebar-label'>Match score</p>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.5rem' }}>
                            <div className={`match-score__ring ${scoreClass}`}>
                                <span className='match-score__value'>{report.matchScore}</span>
                                <span className='match-score__pct'>%</span>
                            </div>
                            <p className={`match-score__sub ${scoreClass}`}>{scoreLabel}</p>
                        </div>
                    </div>

                    <div className='sidebar-divider' />

                    {/* Skill Gaps */}
                    <div className='sidebar-section'>
                        <p className='sidebar-label'>Skill gaps</p>
                        <div className='skill-list'>
                            {report.skillGaps.map((gap, i) => (
                                <div key={i} className='skill-row'>
                                    <span className='skill-name'>{gap.skill}</span>
                                    <span className={`severity-badge severity-badge--${gap.severity}`}>
                                        {gap.severity}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                </aside>
            </div>
        </div>
    )
}

export default Interview