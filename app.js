const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const KEY = "tailordesk_orders_v1";
let orders = JSON.parse(localStorage.getItem(KEY) || "[]");
const money = n => "₹" + Number(n||0).toLocaleString("en-IN",{maximumFractionDigits:2});
const esc = s => String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const prettyDate = d => d ? new Date(d+"T00:00:00").toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}) : "—";
const norm = s => (s||"").toLowerCase().replaceAll(" ","-");
function save(){localStorage.setItem(KEY,JSON.stringify(orders));render();}
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2300);}
function page(name){$$(".page").forEach(p=>p.classList.toggle("active",p.id==="page-"+name));$$(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===name));$("#pageCrumb").textContent=({dashboard:"Dashboard",orders:"Orders",customers:"Customers",measurements:"Measurements",calendar:"Trials & delivery",payments:"Payments",reports:"Reports"})[name];$("#sidebar").classList.remove("open");render();}
function customerNames(){return [...new Set(orders.map(o=>o.customer.trim()).filter(Boolean))];}
function statusTag(s){return `<span class="status ${norm(s)}">${esc(s)}</span>`;}
function orderRow(o){return `<tr><td><b>${esc(o.id)}</b></td><td class="customer-cell"><b>${esc(o.customer)}</b><small>${esc(o.phone||"No phone")}</small></td><td>${esc(o.garment)}</td><td>${prettyDate(o.trial)}</td><td>${prettyDate(o.delivery)}</td><td>${money(o.amount)}</td><td>${statusTag(o.status)}</td><td><button class="text-btn" data-view="${esc(o.id)}">Details</button></td></tr>`;}
function render(){
 const active=orders.filter(o=>!["Delivered"].includes(o.status)), complete=orders.filter(o=>o.status==="Delivered");
 const due=orders.filter(o=>o.status!=="Delivered" && [o.trial,o.delivery].some(d=>d && daysFromToday(d)>=0 && daysFromToday(d)<=7));
 const balance=orders.reduce((a,o)=>a+Math.max(0,Number(o.amount)-Number(o.paid)),0);
 $("#statActive").textContent=active.length;$("#statDue").textContent=due.length;$("#statBalance").textContent=money(balance);$("#statComplete").textContent=complete.length;$("#navOrderCount").textContent=orders.length;
 $("#recentOrders").innerHTML=orders.slice().reverse().slice(0,5).map(o=>`<tr><td><b>${esc(o.id)}</b></td><td class="customer-cell"><b>${esc(o.customer)}</b><small>${esc(o.phone||"")}</small></td><td>${esc(o.garment)}</td><td>${prettyDate(o.delivery)}</td><td>${statusTag(o.status)}</td></tr>`).join("")||`<tr><td colspan="5" class="empty-state">No orders yet — create your first order.</td></tr>`;
 const upcoming=orders.flatMap(o=>[{date:o.trial,type:"Trial",o},{date:o.delivery,type:"Delivery",o}]).filter(x=>x.date&&x.date>=todayISO()&&x.o.status!=="Delivered").sort((a,b)=>a.date.localeCompare(b.date)).slice(0,5);
 $("#upcomingList").innerHTML=upcoming.map(x=>`<div class="upcoming-item"><div class="date-box"><b>${new Date(x.date+"T00:00:00").getDate()}</b><small>${new Date(x.date+"T00:00:00").toLocaleDateString("en",{month:"short"})}</small></div><div><b>${x.type}: ${esc(x.o.customer)}</b><small>${esc(x.o.garment)} · ${prettyDate(x.date)}</small></div></div>`).join("")||`<p class="muted">No upcoming dates. Add a trial or delivery date to an order.</p>`;
 const q=($("#orderSearch")?.value||"").toLowerCase(), f=$("#statusFilter")?.value||"";
 const filtered=orders.filter(o=>(!f||o.status===f)&&[o.id,o.customer,o.garment].join(" ").toLowerCase().includes(q));
 $("#ordersTable").innerHTML=filtered.map(orderRow).join("");$("#emptyOrders").hidden=filtered.length>0;
 const cq=($("#customerSearch")?.value||"").toLowerCase();
 const customers=customerNames().filter(n=>n.toLowerCase().includes(cq));
 $("#customersTable").innerHTML=customers.map(n=>{const list=orders.filter(o=>o.customer===n);const last=list[list.length-1];return `<tr><td class="customer-cell"><b>${esc(n)}</b><small>${list.length} order(s)</small></td><td>${esc(last.phone||"—")}</td><td>${list.length}</td><td>${esc(last.garment)}</td><td><button class="text-btn" data-customer="${esc(n)}">View</button></td></tr>`}).join("");$("#emptyCustomers").hidden=customers.length>0;
 const latestByCustomer=customerNames().map(n=>orders.filter(o=>o.customer===n).slice(-1)[0]);
 $("#measurementsTable").innerHTML=latestByCustomer.filter(o=>o.measure).map(o=>`<tr><td><b>${esc(o.customer)}</b></td><td>${esc(o.measure.chest||"—")}</td><td>${esc(o.measure.waist||"—")}</td><td>${esc(o.measure.hip||"—")}</td><td>${esc(o.measure.shoulder||"—")}</td><td>${esc(o.measure.sleeve||"—")}</td><td>${esc(o.measure.unit||"—")}</td></tr>`).join("");$("#emptyMeasurements").hidden=latestByCustomer.some(o=>o.measure);
 const trials=orders.filter(o=>o.trial&&o.status!=="Delivered").sort((a,b)=>a.trial.localeCompare(b.trial)), deliveries=orders.filter(o=>o.delivery&&o.status!=="Delivered").sort((a,b)=>a.delivery.localeCompare(b.delivery));
 $("#trialCount").textContent=trials.length;$("#deliveryCount").textContent=deliveries.length;
 const sched=[...trials.map(o=>({date:o.trial,type:"Trial",o})),...deliveries.map(o=>({date:o.delivery,type:"Delivery",o}))].sort((a,b)=>a.date.localeCompare(b.date));
 $("#scheduleList").innerHTML=sched.map(x=>`<div class="schedule-item"><div class="date-box"><b>${new Date(x.date+"T00:00:00").getDate()}</b><small>${new Date(x.date+"T00:00:00").toLocaleDateString("en",{month:"short"})}</small></div><div style="flex:1"><b>${x.type} · ${esc(x.o.customer)}</b><small>${esc(x.o.garment)} · ${prettyDate(x.date)}</small></div>${statusTag(x.o.status)}</div>`).join("")||`<p class="muted">No trial or delivery dates recorded.</p>`;
 const total=orders.reduce((a,o)=>a+Number(o.amount),0), paid=orders.reduce((a,o)=>a+Number(o.paid),0);
 $("#totalValue").textContent=money(total);$("#totalPaid").textContent=money(paid);
 $("#paymentsTable").innerHTML=orders.map(o=>`<tr><td>${esc(o.id)}</td><td>${esc(o.customer)}</td><td>${money(o.amount)}</td><td>${money(o.paid)}</td><td>${money(Math.max(0,o.amount-o.paid))}</td><td>${o.paid>=o.amount?"Paid":o.paid>0?"Part paid":"Unpaid"}</td></tr>`).join("")||`<tr><td colspan="6" class="empty-state">No payment records yet.</td></tr>`;
 $("#reportCustomers").textContent=customerNames().length;$("#reportOrders").textContent=orders.length;$("#reportRevenue").textContent=money(paid);$("#reportOutstanding").textContent=money(balance);
 const statuses=["New","In progress","Trial scheduled","Ready","Delivered"];
 $("#statusBreakdown").innerHTML=statuses.map(s=>{const n=orders.filter(o=>o.status===s).length;const pct=orders.length?n/orders.length*100:0;return `<div class="bar-row"><span>${s}</span><div class="bar"><i style="width:${pct}%"></i></div><b>${n}</b></div>`}).join("");
}
function todayISO(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
function daysFromToday(d){return Math.round((new Date(d+"T00:00:00")-new Date(todayISO()+"T00:00:00"))/86400000);}
function openModal(){ $("#orderModal").hidden=false; }
function closeModal(){ $("#orderModal").hidden=true;$("#orderForm").reset(); }
function makeId(){return "TD-"+String(Date.now()).slice(-6);}
$("#orderForm").addEventListener("submit",e=>{e.preventDefault();const fd=new FormData(e.target),v=Object.fromEntries(fd.entries());const amount=Number(v.amount||0),paid=Number(v.paid||0);if(paid>amount){toast("Advance cannot exceed the order amount.");return;}const o={id:makeId(),customer:v.customer.trim(),phone:v.phone,garment:v.garment,quantity:Number(v.quantity||1),fabric:v.fabric,design:v.design,notes:v.notes,measure:{chest:v.chest,waist:v.waist,hip:v.hip,shoulder:v.shoulder,sleeve:v.sleeve,length:v.length,unit:v.unit},trial:v.trial,delivery:v.delivery,amount,paid,status:v.status,created:new Date().toISOString()};orders.push(o);save();closeModal();toast("Order saved successfully.");});
$$("[data-close]").forEach(b=>b.addEventListener("click",closeModal));
$("#orderModal").addEventListener("click",e=>{if(e.target.id==="orderModal")closeModal();});
$("#nav").addEventListener("click",e=>{const b=e.target.closest("[data-page]");if(b)page(b.dataset.page);});
document.addEventListener("click",e=>{const go=e.target.closest("[data-goto]");if(go)page(go.dataset.goto);if(e.target.closest('[data-action="order"]')||e.target.id==="topNewOrder"||e.target.id==="dashNewOrder")openModal();const view=e.target.closest("[data-view]");if(view){const o=orders.find(x=>x.id===view.dataset.view);if(o)alert(`Order ${o.id}\\nCustomer: ${o.customer}\\nPhone: ${o.phone||"—"}\\nGarment: ${o.garment}\\nFabric: ${o.fabric||"—"}\\nDesign: ${o.design||"—"}\\nTrial: ${prettyDate(o.trial)}\\nDelivery: ${prettyDate(o.delivery)}\\nStatus: ${o.status}\\nAmount: ${money(o.amount)}\\nPaid: ${money(o.paid)}\\nNotes: ${o.notes||"—"}`);}const cust=e.target.closest("[data-customer]");if(cust){const list=orders.filter(o=>o.customer===cust.dataset.customer);alert(`${cust.dataset.customer}\\n${list.length} order(s)\\n`+list.map(o=>`${o.id} · ${o.garment} · ${o.status}`).join("\\n"));}});
$("#orderSearch").addEventListener("input",render);$("#statusFilter").addEventListener("change",render);$("#customerSearch").addEventListener("input",render);
$("#addCustomerBtn").addEventListener("click",()=>{openModal();$("#orderForm").elements.customer.focus();});
$("#exportBtn").addEventListener("click",()=>{const cols=["id","customer","phone","garment","quantity","fabric","design","trial","delivery","amount","paid","status","notes"];const csv=[cols.join(","),...orders.map(o=>cols.map(k=>`"${String(o[k]??"").replaceAll('"','""')}"`).join(","))].join("\\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="tailordesk-orders.csv";a.click();URL.revokeObjectURL(a.href);toast("CSV export prepared.");});
$("#menuBtn").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
$("#today").textContent=new Date().toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short",year:"numeric"});
render();
