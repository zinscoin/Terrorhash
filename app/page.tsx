"use client";
import Map from "../components/TerrorMap";
import dayjs from "dayjs";
import { useEffect, useState } from "react";

const presets = [
  { k: "7d", label: "7 days", from: () => dayjs().subtract(7, "day").toISOString() },
  { k: "30d", label: "30 days", from: () => dayjs().subtract(30, "day").toISOString() },
  { k: "1y", label: "1 year", from: () => dayjs().subtract(1, "year").toISOString() },
  { k: "5y", label: "5 years", from: () => dayjs().subtract(5, "year").toISOString() },
  { k: "10y", label: "10 years", from: () => dayjs().subtract(10, "year").toISOString() },
  { k: "20y", label: "20 years", from: () => dayjs().subtract(20, "year").toISOString() },
  { k: "since911", label: "Since 9/11", from: () => new Date("2001-09-11T00:00:00Z").toISOString() }
];

export default function Page() {
  const [from, setFrom] = useState(presets[1].from()); // default 30d
  const [active, setActive] = useState("30d");
  const [lastUpdate, setLastUpdate] = useState<string>("");

  useEffect(() => {
    const t = setInterval(() => setLastUpdate(new Date().toISOString()), 60000);
    setLastUpdate(new Date().toISOString());
    return () => clearInterval(t);
  }, []);

  return (
    <div className="wrap">
      <div className="header" style={{gridColumn:"1 / -1"}}>
        <div style={{fontWeight:700,fontSize:18}}>TerrorHash</div>
        <div className="live"><span className="dot"/> LIVE</div>
        <div style={{marginLeft:"auto"}}>Last update: {new Date(lastUpdate).toUTCString()}</div>
      </div>

      <aside className="sidebar">
        <h3 style={{marginTop:0}}>Filters</h3>
        <div className="controls">
          {presets.map(p => (
            <button key={p.k} className={`btn ${active===p.k?"active":""}`} onClick={() => {setFrom(p.from()); setActive(p.k);}}>
              {p.label}
            </button>
          ))}
        </div>
        <div style={{marginTop:12}}>
          <div style={{fontWeight:600, marginBottom:6}}>Types</div>
          <div style={{display:"grid",gap:6}}>
            <label><input type="checkbox" defaultChecked/> Bombing</label>
            <label><input type="checkbox" defaultChecked/> Shooting</label>
            <label><input type="checkbox" defaultChecked/> Stabbing</label>
            <label><input type="checkbox" defaultChecked/> Vehicle</label>
            <label><input type="checkbox"/> Arson</label>
          </div>
        </div>
        <div style={{marginTop:16}}>
          <a href="/methodology" style={{color:"#93c5fd"}}>Methodology (GTD)</a>
        </div>
      </aside>

      <main className="main">
        <Map fromISO={from} presetKey={active}/>
      </main>
    </div>
  );
}
