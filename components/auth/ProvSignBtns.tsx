import { GithubLogo } from "../svg/GithubLogo";
import { GoogleLogo } from "../svg/GoogleLogo";
import ProviderSignInBtn from "./ProvSignBtn";

const ProviderSignInBtns = ({ signInCard, disabled, onLoading }: {
    signInCard?: boolean;
    disabled?: boolean;
     onLoading: React.Dispatch<React.SetStateAction<boolean>>
}) => {
  return (
    <div className="flex flex-col gap-2">
      <ProviderSignInBtn onLoading={onLoading} providerName="google" disabled={disabled} className="w-full rounded-[1.9rem] border text-sm sm:text-base h-12 sm:h-10">
      <GoogleLogo className="mr-2" width={20} height={20} />
        {signInCard
          ? 'Sign in with Google'
          : "Sign up with Google" }
      </ProviderSignInBtn>

      <ProviderSignInBtn onLoading={onLoading} providerName="github" disabled={disabled} className="w-full rounded-[1.9rem] border text-sm sm:text-base h-12 sm:h-10">
      <GithubLogo className="mr-2" width={20} height={20} />
      {signInCard
          ? 'Sign in with Github'
          : "Sign up with Github" }
      </ProviderSignInBtn>
    </div>
  );
};

export default ProviderSignInBtns;
