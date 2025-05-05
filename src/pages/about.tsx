import { FAQAccordion } from '../components/FAQAccordion'
import '../styles/about.css'
import '../styles/FAQ.css'
import '../styles/styles.css'
import thumb from '../assets/img/DEGM Thumb.png'
import vivian from '../assets/img/vivian james.png'

export type FAQItem = {
  question: string
  answer: string
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: "You don't host mod files?",
    answer: `We could, but that's not the focus. When a creator publishes a mod, they have the option to upload their mod files 
    to whichever server they want and simply add the link to their post. To the end user, there's no difference; they'd always see 
    a 'Download' button. This results in the censorship-resistant structure of a creator's mod post. However, later on, we'll be 
    implementing a system where creators can upload within the site (not to the site) and choose from multiple server hosts 
    (to upload to one or more), with us potentially offering a backup. This system would also provide censorship resistance to 
    the mod files themselves, as anyone would be able to host the files, back them up, and provide them for the public to download from, 
    decreasing the chance of the file getting taken down or lost.`
  },
  {
    question:
      'How do you assure security of game mod files that someone downloads?',
    answer: `When a mod creator attempts to publish a mod, there is a security field that they can fill out 
    that shows a scan report of the files, and users would be able to see that report. If a mod creator doesn't add a report, 
    a prominent warning would be shown to the user on a mod's post (TBA, if not already added). Later, when the new file uploading 
    system (Blossom) gets implemented, along with further security implementations, a scan would automatically happen (depending on 
    the server that it is being uploaded to), and a report would be auto-generated and shared within the mod post.`
  },
  {
    question: "Why are you quoting 'account'?",
    answer: `We use 'account' in quotes because technically you're generating a
      key pair, not creating a traditional account. The next FAQ explains more.`
  },
  {
    question: "You 'can't' remove mods or ban accounts? How does that work?",
    answer: `I'll try my best to simplify the technicalities of this answer... Because of the nature of Nostr,
      the 'account' creation process involves the generation/obtaining two cryptographic key pairs,
      one private (think of that as your password that you cannot change), and one public (think of that
      as your username that you cannot change). These key pairs are coming from the Nostr protocol itself,
      and nobody controls Nostr, it's just there. Considering that, we can't 'ban' anyone directly. We might
      have a mute-list with public addresses that won't show their posts/submissions on this site, but they
      are still there and accessible by anyone. It's the same with someone's posts, we can't touch those as well.
      Gist: If someone put a gun to your / the team's head, will you censor or ban anyone? No, because we can't.`
  },
  {
    question:
      "You can't do anything about any mod or person? Nothing at all? What about the illegal stuff?",
    answer: `While we can't directly take down mod posts or ban user accounts, the best that we can do is hide 
    posts from initially being viewed on the site. However, they can still be accessible if a user has a direct 
    link, and they can also be accessible on different sites running the same protocol and similar setup to DEG Mods. 
    When non-mods, harmful, or illegal posts are published, such posts would be discovered and then hidden. 
    Afterwards, relevant authorities would handle the rest.`
  },
  {
    question:
      'Why did you have to add Bitcoin? Why not traditional payment methods like Visa, PayPal, etc?',
    answer: `For various reasons. With traditional payment methods, not everyone has access to them, they
      can pressure or threaten us, mod creators, or even gamers to censor or ban, or restrict usage of this site
      by holding our funds or stealing them. They can prevent you from tipping on this site or specific mod creators,
      and there's no privacy. These are just a few reasons why we aren't using traditional payment methods.
      With Bitcoin, anyone has access to it, nobody controls it so you can't be threatened with/by it,
      you can actually own and properly control it, and it provides pseudonymity.`
  },
  {
    question: 'Is this an open-source project?',
    answer: `Yes, DEG Mods is open-source. You can access the code repository
    here (sharing soon).`
  },
  {
    question: "Who's developing / maintaining DEG Mods?",
    answer: `Considering this is an open-source project, anyone can contribute to its development and maintenance.
      With that said, the project was ideated, launched, and led by Freakoverse.`
  },
  {
    question: "Who's that character above with the orange hair?",
    answer: `That's Vivian James, a fictional gamer character.`
  },
  {
    question: "Who's that character above with the purple hair?",
    answer: `That's Moda-chan. DEG Mods' mascot. She's a game mod creator!`
  }
]

export const AboutPage = () => {
  return (
    <div className="InnerBodyMain">
      <div className="ContainerMain">
        <div className="IBMSecMainGroup">
          <div className="IBMSecMain">
            <div className="AboutSec">
              <img
                src="https://image.nostr.build/ad021a18bc5784d26c000ab63b56b8c4358ff3f0765b5eb71dc14415419bd6a2.png"
                style={{ width: '100%' }}
                alt="About Section"
              />
              <div className="LearnText">
                <div className="LearnTextInside">
                  <h1
                    className="LearnTextHeading"
                    style={{ textAlign: 'center' }}
                  >
                    Liberating Game Mods
                  </h1>
                  <img src={thumb} alt="Thumbnail" />
                  <p className="LearnTextPara">
                    Never get your game mods censored, get banned, lose your
                    history, nor lose the connection between creators and fans.
                    Find the game mod you want and download it. Gamers and
                    developers are getting censored and suppressed, and this is
                    an attempt to stop it.
                    <br />
                  </p>
                  <p className="LearnTextPara">
                    DEG Mods (Decentralized Game Mods) is an actual platform
                    where game mod creators can thrive without the fear of
                    censorship, bans, or losing their connection with fans. Game
                    mod creators and enthusiasts are empowered here because,
                    well, we literally can't fuck with them.
                    <br />
                  </p>
                  <h3 className="LearnTextHeading">
                    What's the story with DEG Mods?
                  </h3>
                  <p className="LearnTextPara">
                    The idea behind DEG Mods was born out of frustration with
                    the widespread censorship and control imposed on game mods
                    across various platforms. Many mod creators faced bans, lost
                    their work, and had their voices silenced by platforms
                    imposing their ideals. DEG Mods aims to change that
                    narrative by being developed on Nostr, a revolutionary new
                    communications protocol.{' '}
                    <a
                      className="linkMain"
                      href="https://nostr.com/"
                      target="_blank"
                    >
                      Learn more about Nostr here.
                    </a>
                    <br />
                  </p>
                  <h3 className="LearnTextHeading">
                    Real quick though. What's Nostr?
                  </h3>
                  <p className="LearnTextPara">
                    Nostr is a communications protocol that makes it extremely
                    hard for anyone to censor anyone's data, and can never have
                    your "account" get "banned". Nostr ensures that even this
                    site's creators cannot censor mods or ban anyone directly.
                    <br />
                  </p>
                  <h3 className="LearnTextHeading">How DEG Mods Works</h3>
                  <p className="LearnTextPara">
                    Unlike traditional mod hosting platforms, DEG Mods doesn't
                    host any files. Think of it as a browser, presenting game
                    mods published by their creators. Mod creators provide
                    direct download links on their mod pages, allowing gamers to
                    access the mods effortlessly. If a link breaks or gets
                    censored, mod creators can remove that link and add another.
                    <br />
                    <br />
                    Also, everything is open sourced. Even if the site were to
                    shut down, someone can simply take the same code and run it
                    under a different name, and every mod would still be
                    accessible, along with their links, reactions/ratings, and
                    comments, as well as being completely functional as well.
                    You'd also be able to just simply run the site on your PC,
                    without having it up on a domain.
                  </p>
                  <h3 className="LearnTextHeading">Tips / Donations</h3>
                  <p className="LearnTextPara">
                    DEG Mods supports hassle-free money transfers for modders.
                    Fans can show their appreciation by directly tipping mod
                    creators via Bitcoin through the Lightning Network, an
                    action known as Zapping. Choose to support creators so they
                    can continue making more valuable game mods!
                    <br />
                  </p>
                  <h3 className="LearnTextHeading">
                    Wait, Crypto?! Ew.
                    <br />
                  </h3>
                  <p className="LearnTextPara">
                    We know. You don't have to use it. Nothing is reliant on it
                    on this platform/site. Pretend its not even there. We're not
                    even making any money out of this project/site, in-fact,
                    we're running at a loss (unless direct donations/tips covers
                    it, and/or we managed to add reasonable monetization systems
                    to help cover further development and maintenance costs).
                    This is just a passion project to help free (liberate) game
                    mods and their creators, and this part potentially helps
                    them financially, even those in other countries where
                    "normal" methods of money payment/transfer are not an
                    option. You can just find the mod you want and download it,
                    or publish the mod you've created, and never even touch
                    Bitcoin.
                    <br />
                  </p>
                  <p className="LearnTextPara">
                    DEG Mods is a response to censorship and oppression, to
                    bring freedom and not hinder people's desires and
                    creativity. If you know a mod creator that's being censored,
                    then show them the way. Modders just want to mod, and gamers
                    just want to game in peace...
                    <br />
                  </p>
                  <h3 className="LearnTextHeading">
                    So, What is DEG Mods?
                    <br />
                  </h3>
                  <p className="LearnTextPara">
                    DEG Mods is an open-source game mods browser (you can stop
                    right here if you want) of what's uploaded on servers owned
                    by unrelated people around the world. That's the appropriate
                    description.
                    <br />
                    <br />
                    Another way of describing it:
                    <br />A true mod site.
                  </p>
                  <div className="learnLinks">
                    <a
                      className="learnLinksLink"
                      href="https://degmods.com/profile/nprofile1qqs0f0clkkagh6pe7ux8xvtn8ccf77qgy2e3ra37q8uaez4mks5034gfw4xg6"
                      target="_blank"
                    >
                      <img
                        className="learnLinksLinkImg"
                        src="https://image.nostr.build/fb557f1b6d58c7bbcdf4d1edb1b48090c76ff1d1384b9d1aae13d652e7a3cfe4.gif"
                        style={{ maxWidth: '28px' }}
                      />
                    </a>
                    <a
                      className="learnLinksLink"
                      href="https://twitter.com/DEGMods"
                      target="_blank"
                    >
                      <img
                        className="learnLinksLinkImg"
                        src="https://image.nostr.build/4b38de750bec88a7977767bb69824a928927ed542fee96a258b0e7e4ee4c5b53.png"
                      />
                    </a>
                  </div>
                </div>
                <img className="LearnTextCharacterImgRight" src={vivian} />
              </div>

              <div className="LearnFAQ">
                <FAQAccordion id="accordion-1" items={FAQ_ITEMS} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
