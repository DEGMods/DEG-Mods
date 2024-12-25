interface TabsProps {
  tabs: string[]
  tab: number
  setTab: React.Dispatch<React.SetStateAction<number>>
}

export const Tabs = ({ tabs, tab, setTab }: TabsProps) => {
  return (
    <div className='IBMSMSplitMainFullSideSec IBMSMSMFSSNav'>
      {tabs.map((t, i) => {
        return (
          <button
            key={t}
            className={`btn btnMain IBMSMSMFSSNavBtn${
              tab === i ? ' IBMSMSMFSSNavBtnActive' : ''
            }`}
            type='button'
            onClick={() => setTab(i)}
          >
            {t}
          </button>
        )
      })}
    </div>
  )
}
