'use client'; import {Chart as ChartJS,ArcElement,Tooltip,Legend,CategoryScale,LinearScale,BarElement} from 'chart.js'; import {Pie,Bar} from 'react-chartjs-2'; ChartJS.register(ArcElement,Tooltip,Legend,CategoryScale,LinearScale,BarElement);
export function PieCard({labels,data}:{labels:string[],data:number[]}){return <Pie data={{labels,datasets:[{data}]}}/>}
export function BarCard({labels,data}:{labels:string[],data:number[]}){return <Bar options={{indexAxis:'y',responsive:true}} data={{labels,datasets:[{label:'Attendance %',data}]}}/>}
