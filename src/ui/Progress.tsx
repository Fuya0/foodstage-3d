import type { FoodStage } from '../data/foods';

export function Progress({ stage, bites, stages }: { stage: number; bites: number; stages: readonly FoodStage[] }) {
  return <div className="progress" role="group" aria-label={`第 ${stage + 1} 阶段，已吃 ${bites} 口，共 ${stages[stage]!.bites} 口`}>
    {stages.map((item, index) => {
      const count = index < stage ? item.bites : index === stage ? bites : 0;
      return <div className={`bite-stage${index === stage ? ' active' : ''}${index < stage ? ' complete' : ''}`} key={index} aria-hidden="true">
        <span className="stage-label">{String(index + 1).padStart(2, '0')}</span>
        <span className="bite-notches">{Array.from({ length: item.bites }, (_, notch) => <i className={notch < count ? 'filled' : ''} key={notch} />)}</span>
      </div>;
    })}
  </div>;
}
