document.addEventListener("DOMContentLoaded",()=>{

const menuToggle=document.getElementById("menuToggle");

const mobileSidebar=document.getElementById("mobileSidebar");

const sidebarOverlay=document.getElementById("sidebarOverlay");

const sidebarClose=document.getElementById("sidebarClose");

const sidebarLinks=document.querySelectorAll(".sidebar-links a");

function openSidebar(){

mobileSidebar.classList.add("open");

sidebarOverlay.classList.add("show");

menuToggle.setAttribute("aria-expanded","true");

menuToggle.setAttribute("aria-label","Close navigation menu");

document.body.style.overflow="hidden";

}

function closeSidebar(){

mobileSidebar.classList.remove("open");

sidebarOverlay.classList.remove("show");

menuToggle.setAttribute("aria-expanded","false");

menuToggle.setAttribute("aria-label","Open navigation menu");

document.body.style.overflow="";

}

if(menuToggle){

menuToggle.addEventListener("click",()=>{

const isOpen=mobileSidebar.classList.contains("open");

if(isOpen){

closeSidebar();

}else{

openSidebar();

}

});

}

if(sidebarClose){

sidebarClose.addEventListener("click",closeSidebar);

}

if(sidebarOverlay){

sidebarOverlay.addEventListener("click",closeSidebar);

}

if(sidebarLinks.length>0){

sidebarLinks.forEach(link=>{

link.addEventListener("click",()=>{

closeSidebar();

});

});

}

document.addEventListener("keydown",event=>{

if(event.key==="Escape"&&mobileSidebar.classList.contains("open")){

closeSidebar();

}

});

const counters=document.querySelectorAll(".counter");

const animateCounter=counter=>{

const target=Number(counter.dataset.target);

let currentNumber=0;

const increment=Math.max(1,Math.ceil(target/100));

const updateCounter=()=>{

currentNumber+=increment;

if(currentNumber>=target){

currentNumber=target;

}

counter.textContent=currentNumber.toLocaleString();

if(currentNumber<target){

requestAnimationFrame(updateCounter);

}

};

updateCounter();

};

if(counters.length>0){

const counterObserver=new IntersectionObserver((entries,observer)=>{

entries.forEach(entry=>{

if(entry.isIntersecting){

animateCounter(entry.target);

observer.unobserve(entry.target);

}

});

},{threshold:0.3});

counters.forEach(counter=>{

counterObserver.observe(counter);

});

}

const revealElements=document.querySelectorAll(".reveal");

if(revealElements.length>0){

const revealObserver=new IntersectionObserver((entries,observer)=>{

entries.forEach(entry=>{

if(entry.isIntersecting){

entry.target.classList.add("show");

observer.unobserve(entry.target);

}

});

},{threshold:0.15});

revealElements.forEach(element=>{

revealObserver.observe(element);

});

}

const currentYear=document.getElementById("currentYear");

if(currentYear){

currentYear.textContent=new Date().getFullYear();

}

console.log("SkillConnect homepage JavaScript loaded successfully.");

});