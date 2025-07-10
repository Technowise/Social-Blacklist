import { Devvit, SettingScope} from '@devvit/public-api';

enum removalReasons {
  blacklistedDomainInSocialLinks = "Blacklisted domain found in user's Social Links",
  blacklistedDomainInStickyPost = "BLacklisted domain found in user's Sticky post",
  blacklistedDomainInRecentComments= "Blacklisted domain found in user's Recent comments",
  NSFWProfile= "NSFW Profile",
}

Devvit.configure({redditAPI: true, 
                  redis: true,
                  userActions: false });

Devvit.addSettings([
  {
    type: 'string',
    name: 'blacklisted-domains',
    label: 'Blacklisted Social Domains (comma-separated):',
    scope: SettingScope.Installation,
    helpText: "Provide a list of black-listed domains -  For example: instagram.com, youtube.com",
    onValidate: ({ value }) => {
      // Split the input and trim whitespace
      if (typeof value == "string") {
        if( value.length == 0 ) {
          return "This field is required";
        }
        const domains = value.split(',').map((d) => d.trim());
        // Simple validation: check if each domain matches a basic pattern
        const domainPattern = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        for (const domain of domains) {
          if (!domainPattern.test(domain)) {
            return `Invalid domain: ${domain}`;
          }
        }
      }
    }
  },
  {
    type: 'string',
    name: 'removal-message',
    label: 'Message to user on removal of the post:',
    defaultValue: "Your post has been removed from this sub based on your profile information. Please review the rules of the sub for further information on what is allowed/disallowed on this subreddit.",
    scope: SettingScope.Installation,
  },
  {
    type: 'boolean',
    name: 'notifyModeratorsOnPostRemoval',
    label: 'Notify post removal through mod-mail:',
    scope: SettingScope.Installation, 
    defaultValue: false
  },
   /*
  {
    type: 'boolean',
    name: 'removeNSFWProfilePosts',
    label: 'Remove posts made by NSFW profiles',
    scope: SettingScope.Installation, 
    defaultValue: false,
    
  },
  {
    type: 'number',
    name: 'max-removals',
    label: 'Number of removals after which the user would be banned',
    scope: SettingScope.Installation,
    defaultValue: 3
  }
  */
]);

Devvit.addTrigger({
  event: 'PostSubmit',
  onEvent: async (event, context) => {
    const blacklisted_list = await context.settings.get('blacklisted-domains');
    const removal_message = await context.settings.get('removal-message')??'';
    const subredditName = context.subredditName??'';

    var removalReason:removalReasons = removalReasons.blacklistedDomainInSocialLinks ;

    if( blacklisted_list && typeof blacklisted_list== "string") {

      const blacklisted_domains =blacklisted_list
      .split(',')
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean);

      // Get the post author
      var authorId = event.post?.authorId;
      if( typeof authorId == "string" && event.post!= undefined ) {
        const author = await context.reddit.getUserById(authorId);
        var authorName = author?.username??"nobody";
        var authorProfileIsNSFW = false;

        // Fetch social links
        const socialLinks = await author?.getSocialLinks(); // Returns array of UserSocialLink objects

        // Check if any social link matches a blacklisted domain
        const blacklistedDomainFoundInSocialLinks = socialLinks?.some(link =>
          blacklisted_domains.some(domain => link.outboundUrl.toLowerCase().includes(domain))
        );

        if (blacklistedDomainFoundInSocialLinks) {
          removalReason = removalReasons.blacklistedDomainInSocialLinks;
        }
        /*
        else if (author?.nsfw) {
          authorProfileIsNSFW = true;
          removalReason = removalReasons.NSFWProfile;
          console.log("Removing post as the user's profile is NSFW'");
        }
        */

        if( authorProfileIsNSFW || blacklistedDomainFoundInSocialLinks )
        {
          const redditComment = await context.reddit.submitComment({
            id: event.post.id,
            text: `${removal_message}`
          });

          await redditComment.distinguish(true);

          await context.reddit.sendPrivateMessage({
            to: authorName,
            subject: `Your post '${event.post.title}' has been removed from ${subredditName}`,
            text: `${removal_message} - post link: ${event.post.permalink}`,
          });

          const post =await context.reddit.getPostById(event.post.id);
          const postRemoved = await post.remove();

          const notifyModeratorsOnPostRemoval = await context.settings.get('notifyModeratorsOnPostRemoval');

          if( notifyModeratorsOnPostRemoval ) {
            const conversationId = await context.reddit.modMail.createModNotification({  
              subject: 'post removal from Social-Blacklist',
              bodyMarkdown: 'A post has been removed by Social-Blacklist.\n\n Post title: '+post.title+'\n\n Post link: '+post.permalink+'\n\n Removal reason: '+removalReason,
              subredditId: context.subredditId,
            });
          }

        }
        //TODO: Keep count of removals in redis, then ban user after X number of removals.   
  
      }

    }

  },
});

export default Devvit;
