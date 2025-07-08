import { Devvit, SettingScope} from '@devvit/public-api';

Devvit.configure({redditAPI: true, 
                  redis: true,
                  userActions: false });

Devvit.addSettings([
  {
    type: 'string',
    name: 'blacklisted-domains',
    label: 'Blacklisted Social Domains (comma-separated)',
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
    label: 'Message to user on removal of the post',
    defaultValue: "This post has been removed from this sub based on your profile information. Please review the rules of the sub for further information on what is allowed/disallowed on this subreddit.",
    scope: SettingScope.Installation,
  },
  /*
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

    if( blacklisted_list && typeof blacklisted_list== "string") {

      const blacklisted_domains =blacklisted_list
      .split(',')
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean);

      // Get the post author
      var authorId = event.post?.authorId;
      if( typeof authorId == "string") {
        const author = await context.reddit.getUserById(authorId);
        var authorName = author?.username??"nobody";

        // Fetch social links
        const socialLinks = await author?.getSocialLinks(); // Returns array of UserSocialLink objects

        // Check if any social link matches a blacklisted domain
        const found = socialLinks?.some(link =>
          blacklisted_domains.some(domain => link.outboundUrl.toLowerCase().includes(domain))
        );

        if (found && event.post!= undefined && removal_message!= undefined) {
          // Remove the post with the selected removal reason

          const redditComment = await context.reddit.submitComment({
            id: event.post.id,
            text: `${removal_message}`
          });

          await context.reddit.sendPrivateMessage({
            to: authorName,
            subject: `Your post '${event.post.title}' has been removed from ${subredditName}`,
            text: `${removal_message} - post link: ${event.post.permalink}`,
          });

          const post =await context.reddit.getPostById(event.post.id);
          const postRemoved = await post.remove();

          console.log("Removing post as the user has social links to blacklisted domains.");
          //TODO: Keep count of removals in redis, then ban user after X number of removals.   
        }
        else {
          console.log("No blacklisted social links found on the user for post");
        }
      }

    }

  },
});

export default Devvit;
