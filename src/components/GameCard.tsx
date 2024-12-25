import { Link } from 'react-router-dom'
import { getGamePageRoute } from 'routes'
import '../styles/cardGames.css'
import { handleGameImageError } from '../utils'

type GameCardProps = {
  title: string
  imageUrl: string
}

export const GameCard = ({ title, imageUrl }: GameCardProps) => {
  const route = getGamePageRoute(title)

  return (
    <Link className='cardGameMainWrapperLink' to={route}>
      <div className='cardGameMainWrapper'>
        <img
          src={imageUrl}
          onError={handleGameImageError}
          className='cardGameMain'
        />
      </div>
      <div className='cardGameMainTitle'>
        <p>{title}</p>
      </div>
    </Link>
  )
}
