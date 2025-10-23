import MatchdayCarousel from '../components/MatchDayCarousel'
import TopFour from '../components/TopFour'
import logo from '../assets/logo.jpg'


export default function Home(){
return (
<main id="home">
<MatchdayCarousel />
<TopFour />
<div>
    <img src={logo} alt="ASD Foggia Calcio Tavolo" className="home-logo" />
</div>
</main>
)
}