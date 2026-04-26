import { Link } from 'react-router-dom'
import { BlogCardDetails } from 'types'
import { getBlogPageRoute } from 'routes'
import '../styles/cardBlogs.css'
import placeholder from '../assets/img/DEGMods Placeholder Img.png'
import { ImageWithFallback } from './ImageWithFallback'

type BlogCardProps = Partial<BlogCardDetails>

export const BlogCard = ({ title, image, nsfw, naddr }: BlogCardProps) => {
  if (!naddr) return null

  return (
    <Link to={getBlogPageRoute(naddr)} className="cardBlogMainWrapperLink">
      <div className="cardBlogMain">
        <ImageWithFallback
          src={image || placeholder}
          className="cardBlogMainImage"
          alt={`featured image for blog ${title}`}
          showVerificationIcon={false}
        />
        <div className="cardBlogMainInside">
          <h3 className="cardBlogMainInsideTitle">{title}</h3>
          {nsfw && (
            <div className="IBMSMSMBSSTagsTag IBMSMSMBSSTagsTagNSFW IBMSMSMBSSTagsTagNSFWCard IBMSMSMBSSTagsTagNSFWCardAlt">
              <p>NSFW</p>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
