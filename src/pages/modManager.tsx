export const ModManagerPage = () => {
  return (
    <div className="InnerBodyMain">
      <div className="ContainerMain">
        <div className="IBMSecMainGroup" style={{ padding: '0' }}>
          <div className="IBMSecMain">
            <div className="LearnText">
              <div className="LearnTextInside">
                <h1
                  className="LearnTextHeading"
                  style={{ textAlign: 'center' }}
                >
                  Mod Manager{' '}
                </h1>
                <p className="LearnTextPara">
                  DEG Mods will eventually have its own mod manager software,
                  which will likely be a fork of Mod Organizer 2. This
                  customized version will be tailored to work seamlessly with
                  DEG Mods. Until then, users can utilize Mod Organizer 2, which
                  is already a powerful and useful tool without any
                  modifications.
                  <br />
                </p>
                <p className="LearnTextPara">
                  Until we develop the DEG Mods Manager, you can use Mod
                  Organizer 2 to make modding your games much easier.
                  <br />
                </p>
                <p className="LearnTextPara">
                  To help you familiarize yourself with Mod Organizer 2, there
                  are online videos available that can guide you. Here's one of
                  them.
                </p>
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '16 / 9',
                    position: 'relative'
                  }}
                >
                  <iframe
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    src="https://www.youtube.com/embed/07-JVWDn7LA"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title="Embedded YouTube"
                  />
                </div>
                <p className="LearnTextPara">
                  You can find and download Mod Organizer 2 from their GitHub
                  repository.
                </p>
                <div style={{ width: '100%' }}>
                  <a
                    className="btn btnMain"
                    style={{ textAlign: 'center' }}
                    href="https://github.com/ModOrganizer2/modorganizer/releases"
                    target="_blank"
                  >
                    Download Mod Organizer 2 from Github
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
