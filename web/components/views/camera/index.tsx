'use client';

import { useCamera } from '../../camera/state';
import { BigStat } from '../../figures';
import { Chip, Foot, PageHead, Panel, segBtn, segWrap } from '../../ui';
import { ByCameraCard, ReviewCard } from './analytics';
import { EventsCard } from './events';
import { PipelineCard } from './pipeline';
import { PlayerCard } from './player';

const twoCols = 'grid grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] gap-4 max-nav:grid-cols-1';

export function CameraView() {
  const { cameras, camId, selectCamera, events, videos } = useCamera();
  const open = events.filter((e) => e.review === 'needs_review').length;
  const entries = events.filter((e) => e.type === 'restricted_zone_entry' && e.review !== 'false_alarm').length;
  const analysed = videos.filter((v) => v.status === 'completed').length;

  return (
    <>
      <PageHead
        title="Camera analysis"
        desc="Checks recorded site video for people, safety gear and restricted-area entry, and lists what a person needs to review."
        tools={
          <>
            <div className={segWrap} role="group" aria-label="Camera" data-tour="cam-pick">
              {cameras.map((c) => (
                <button key={c.id} type="button" className={segBtn} aria-pressed={c.id === camId} title={c.id} onClick={() => selectCamera(c.id)}>
                  {c.name}
                </button>
              ))}
            </div>
          </>
        }
        aside={
          <div className="flex flex-wrap gap-x-10 gap-y-4" data-tour="cam-stats">
            <BigStat value={open} label="Events to review" badge={<Chip tone={open ? 'watch' : 'low'}>{open ? `${open} open` : 'All done'}</Chip>} />
            <BigStat value={entries} label="Restricted-area entries" badge={<Chip tone={entries ? 'act' : 'low'}>{entries ? 'Act' : 'None'}</Chip>} />
            <BigStat value={analysed} label="Videos analysed" badge={<Chip tone="off">Recorded</Chip>} />
          </div>
        }
      />
      <Panel>
        <PipelineCard />
        <div className={twoCols}>
          <PlayerCard />
          <EventsCard />
        </div>
        <div className={twoCols}>
          <ByCameraCard />
          <ReviewCard />
        </div>
        <Foot
          left="Person boxes come from a pretrained detector (YOLO). Sample clips are stock footage from Pexels; their safety-gear results are sample values."
          right="A safety officer reviews every event before any action."
        />
      </Panel>
    </>
  );
}
