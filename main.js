// const sphere = document.getElementById("sphere")
// const rows = []
// for(i = 0; i < 180; i += 10){
//     rows.push(`<div class="line" style="transform: rotateY(${i}deg);"></div>`)
// }

// sphere.innerHTML = rows.join("");

const headerEl = document.querySelector(".header")

window.addEventListener("scroll", function(){
    const scrollPos = window.scrollY

    if(scrollPos > 100) {
        headerEl.classList.add("header__scroll")
    }else{
        headerEl.classList.remove("header__scroll")
    }
})

const menuIcon = document.querySelector('#menu-icon')
const navbar = document.querySelector('.navbar')
const navbg = document.querySelector('.nav-bg')


menuIcon.addEventListener('click', () => {
    menuIcon.classList.toggle('bx-x')
    navbar.classList.toggle('active')
    navbg.classList.toggle('active')
} )
