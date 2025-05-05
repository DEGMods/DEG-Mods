import { capitalizeEachWord } from 'utils'
import '../styles/backup.css'
import backupPlanImg from '../assets/img/DEG Mods Backup Plan.png'
// import placeholder from '../assets/img/DEGMods Placeholder Img.png'
interface BackupItemProps {
  name: string
  image: string
  link: string
  type: 'repo' | 'alt' | 'exe'
}
const BACKUP_LIST: BackupItemProps[] = [
  //   {
  //     name: 'Github',
  //     type: 'repo',
  //     image:
  //       'https://www.c-sharpcorner.com/article/create-github-repository-and-add-newexisting-project-using-github-desktop/Images/github.png',
  //     link: '#'
  //   },
  //   {
  //     name: 'Github, but nostr',
  //     type: 'repo',
  //     image: 'https://vitorpamplona.com/images/nostr.gif',
  //     link: '#'
  //   },
  //   {
  //     name: 'name',
  //     type: 'alt',
  //     image: placeholder,
  //     link: '#'
  //   },
  //   {
  //     name: '',
  //     type: 'exe',
  //     image: placeholder,
  //     link: '#'
  //   }
]

const BackupItem = ({ name, image, link, type }: BackupItemProps) => {
  return (
    <a
      className="backupListLink"
      href={link}
      style={{
        background: `linear-gradient(15deg, rgba(0,0,0,0.75), rgba(0,0,0,0.25)), 
        url("${image}") center / cover no-repeat, 
        linear-gradient(45deg, rgba(0,0,0,0.1), rgba(255,255,255,0.01) 50%, rgba(0,0,0,0.1))`
      }}
      target="_blank"
    >
      <div className="backupListLinkInside">
        <h3>
          {type === 'exe' ? type.toUpperCase() : capitalizeEachWord(type)}:{' '}
          {name}
        </h3>
      </div>
    </a>
  )
}

export const BackupPage = () => {
  return (
    <div className="InnerBodyMain">
      <div className="ContainerMain">
        <div className="IBMSecMainGroup">
          <div className="IBMSecMain">
            <div className="AboutSec">
              <div className="LearnText">
                <div className="LearnTextInside">
                  <h1
                    className="LearnTextHeading"
                    style={{ textAlign: 'center' }}
                  >
                    Backup Plan: Repos, Alts, EXE
                  </h1>
                  <img alt="" src={backupPlanImg} />
                  <p className="LearnTextPara">
                    It's pretty clear that authoritarianism and censorship is on
                    the rise, on all fronts, and from what can be seen, any idea
                    that push for the opposite gets attacked. That's why DEG
                    Mods is running on Nostr, and that's why we're also writing
                    this backup plan.
                    <br />
                  </p>
                  <h3 className="LearnTextHeading">Repositories</h3>
                  <p className="LearnTextPara">
                    Wherever we can, we'll put DEG Mods' code on multiple
                    repositories such as Github, and (github but on nostr).
                    Below you can find the links where we've uploaded the site's
                    code to.
                    <br />
                  </p>
                  <h3 className="LearnTextHeading">Alternatives</h3>
                  <p className="LearnTextPara">
                    With the repositories for DEG Mods is up on multiple places,
                    we encourage people to take the code and duplicate it
                    elsewhere. Fork it, change the design, remove or add systems
                    and features, and make your own version. Below you can find
                    links of alts that we've found.
                    <br />
                  </p>
                  <h3 className="LearnTextHeading">EXE</h3>
                  <p className="LearnTextPara">
                    One last push we'd like to do is to create a .exe that'll
                    open up DEG Mods on your PC, as if you've opened the website
                    normally, with almost all of the functionalities you'd
                    expect (if not all). We want to do this so that in case
                    there are no alternatives, or that they're getting shut
                    down, then you can just rely on this instead. The link to it
                    will be added here the moment it becomes available.
                    <br />
                  </p>
                  <div className="backupList">
                    {BACKUP_LIST.map((b) => (
                      <BackupItem {...b} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
