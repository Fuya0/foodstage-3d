export function Progress({ stage, bites }: { stage: number; bites: number }) {
  return <div className="progress" aria-label={`第 ${stage + 1} 阶段，已吃 ${bites} 口，共 8 口`}>
    {[0, 1, 2, 3].map(index => {
      const count = index < stage ? 8 : index === stage ? bites : 0;
      return <svg key={index} viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
        <circle className="ring-track" cx="12" cy="12" r="8" />
        <circle className="ring-fill" cx="12" cy="12" r="8" pathLength="8" strokeDasharray={`${count} 8`} transform="rotate(-90 12 12)" />
        <circle cx="12" cy="12" r="2" fill={index <= stage ? 'currentColor' : '#DEDCD5'} />
      </svg>;
    })}
  </div>;
}
