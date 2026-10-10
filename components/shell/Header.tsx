import Link from "next/link";
import s from "./shell.module.css";
import NavLinks from "./NavLinks";
import LogoLink from "./LogoLink";
import SearchButton from "./SearchButton";
import Countdown from "@/components/ui/Countdown";
import Icon from "@/components/ui/Icon";
import { flag } from "@/lib/assets";
import { gpZh } from "@/lib/names";
import { SESSION_ZH } from "@/lib/openf1";

export type NextSession = { name: string; start: string; end: string; gp: string; country: string | null; round: number; year: number } | null;

/**
 * formula1.com masthead: carbon bar with its original diagonal-stripe texture (15% white, from x=200, faded by the
 * transparent → carbon gradient), then the event-tracker strip: round flag + GP > on top, session code | countdown below.
 */
export default function Header({ next }: { next: NextSession }) {
  const live = next && new Date(next.start) <= new Date() && new Date(next.end) >= new Date();
  return (
    <header className={s.header}>
      <div className={s.barWrap}>
        <div className={s.texture} aria-hidden><img src="/f1/header-stripes.svg" alt="" /></div>
        <div className={s.fade} aria-hidden />
        <div className={s.bar}>
          <LogoLink className={s.brand}>
            <span className={s.mark} aria-hidden><i /><i /></span>
            <span className={s.word}>PITWALL</span>
          </LogoLink>
          <NavLinks live={!!live} />
          <div className={s.tools}>
            <Link href="/compare" className={s.util}>对比</Link>
            <SearchButton />
          </div>
        </div>
      </div>
      {next && (
        <div className={s.ticker} data-ticker>
          <div className={s.tickerIn}>
            <div className={s.tracker}>
              <Link href={`/races/${next.year}/${next.round}`} className={s.tickerGp}>
                {next.country && <img src={flag(next.country) ?? ""} alt="" />}
                <span>{gpZh(next.gp)}</span>
                <Icon name="chevron-right" size={12} />
              </Link>
              <div className={s.tickerRow}>
                <b className={s.tickerSession}>{SESSION_ZH[next.name] ?? next.name}</b>
                <span className={s.tickerSep} role="separator" />
                {live ? (
                  <Link href="/live" className={s.tickerLive}><i />进行中 · 实时计时</Link>
                ) : (
                  <Countdown to={next.start} units="en" className={s.tickerCount} numClassName={s.tickerNum} unitClassName={s.tickerUnit} />
                )}
              </div>
            </div>
            <Link href={`/races/${next.year}/${next.round}/brief`} className={s.tickerCal}>解说手册</Link>
            <Link href="/calendar" className={s.tickerCal2}><Icon name="calendar" size={16} />赛历与日历订阅</Link>
          </div>
        </div>
      )}
    </header>
  );
}
