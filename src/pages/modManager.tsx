export const ModManagerPage = () => {
  return (
    <div className='InnerBodyMain'>
      <div className='ContainerMain'>
        <div className='IBMSecMainGroup'
        style={{ padding: '0' }}
        >
          <div className='IBMSecMain'>
              <div className='LearnText'>
                <div className='LearnTextInside'>
                  <h1
                    className='LearnTextHeading'
                    style={{ textAlign: 'center' }}
                  >
                    Mod Manager{' '}
                  </h1>
                  <p className='LearnTextPara'>
                    DEG Mods will eventually have it mod manager software of its own, 
                    and most likely it'll be a fork of Mod Organizer 2, where we'll custom-fit 
                    it with what's needed to have it work well with DEG Mods. Until then, however, 
                    people can just utilize Mod Organizer 2 itself. It's already useful and powerful 
                    without any modification of our own.
                    <br />
                  </p>
                  <p className='LearnTextPara'>
                    So until we get to it, making DEG Mods Manager, you can go ahead and use Mod Organizer 2 
                    to make modding your games a lot easier than without a mod manager.
                    <br />
                  </p>
                  <p className='LearnTextPara'>
                    To help you familiarize yourself with Mod Organizer 2 and how to use it, there are videos 
                    available online that can assist you. Here's one of them.
                  </p>
                  <div style={{ width: '100%', aspectRatio: '16 / 9', position: 'relative' }}>
                    <iframe
                      style={{ width: '100%', height: '100%', border: 'none' }}
                      src="https://www.youtube.com/embed/07-JVWDn7LA"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title="Embedded YouTube"
                    />
                  </div>
                  <p className='LearnTextPara'>
                    Here's where you can find and download Mod Organizer 2, from their Github repo.
                  </p>
                  <div style={{ width: '100%' }}>
                    <a
                      className='btn btnMain'
                      style={{ textAlign: 'center' }}
                      href='https://github.com/ModOrganizer2/modorganizer/releases'
                      target='_blank'
                    >Download Mod Organizer 2 from Github
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  )
}